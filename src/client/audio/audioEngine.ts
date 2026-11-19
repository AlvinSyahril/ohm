export type DeckId = 'a' | 'b';

export type EqPresetId = 'flat' | 'bass' | 'vocal' | 'night' | 'custom';

export interface EqBands {
  low: number;  // dB (-6 .. +6)
  mid: number;  // dB (-6 .. +6)
  high: number; // dB (-6 .. +6)
}

export const EQ_PRESETS: Record<Exclude<EqPresetId, 'custom'>, EqBands> = {
  flat: { low: 0, mid: 0, high: 0 },
  bass: { low: 4.5, mid: -1, high: 1 },
  vocal: { low: -2, mid: 4, high: 2 },
  night: { low: -3, mid: 1, high: -3 },
};

export const EQ_PRESET_LABELS: Record<EqPresetId, string> = {
  flat: 'Balanced',
  bass: 'Warm Bass',
  vocal: 'Clear Vocals',
  night: 'Late Night',
  custom: 'Custom',
};

const clampGain = (db: number) => Math.max(-6, Math.min(6, db));

/**
 * Dual-deck Web Audio graph:
 *   deckA -> deckGainA \
 *                       -> lowShelf -> midPeak -> highShelf -> masterGain -> destination
 *   deckB -> deckGainB /
 *
 * Tracks per-element MediaElementAudioSourceNode + GainNode via WeakMap so remounts,
 * StrictMode double-invocations, and HMR swaps never strand raw unattenuated <audio> elements.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private decks: Record<DeckId, HTMLAudioElement | null> = { a: null, b: null };
  private wired = new WeakMap<
    HTMLAudioElement,
    { src: MediaElementAudioSourceNode; gain: GainNode }
  >();
  private deckGains: Record<DeckId, GainNode | null> = { a: null, b: null };
  private lowFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private highFilter: BiquadFilterNode | null = null;
  private normalizer: DynamicsCompressorNode | null = null;
  private normalizerMakeup: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqBins: Uint8Array<ArrayBuffer> | null = null;

  private graphReady = false;
  private fallbackOnly = false;
  private unlockBound = false;
  private activeDeck: DeckId = 'a';
  private deckMix: Record<DeckId, number> = { a: 1, b: 0 };
  private masterVolume = 0.85;
  private sleepAttenuation = 1;
  private eqBands: EqBands = { ...EQ_PRESETS.flat };
  private loudnessNormEnabled = false;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private fadeDoneTimer: ReturnType<typeof setTimeout> | null = null;

  attachDecks(a: HTMLAudioElement | null, b: HTMLAudioElement | null) {
    this.decks.a = a;
    this.decks.b = b;
    if (!a && !b) {
      this.cancelFade('a');
      return;
    }
    if (this.graphReady) {
      this.bindDeck('a', a);
      this.bindDeck('b', b);
      this.applyGains();
    } else {
      this.syncFallbackVolumes();
    }
  }

  getActiveDeckId(): DeckId {
    return this.activeDeck;
  }

  getActiveElement(): HTMLAudioElement | null {
    return this.decks[this.activeDeck];
  }

  getDeckElement(id: DeckId): HTMLAudioElement | null {
    return this.decks[id];
  }

  /** Sample normalized (0..1) bass and overall spectral energy for calm ambient visuals. */
  sampleAtmosphere(): { bass: number; overall: number } {
    if (!this.analyser || !this.freqBins || !this.ctx || this.ctx.state !== 'running') {
      return { bass: 0, overall: 0 };
    }
    this.analyser.getByteFrequencyData(this.freqBins);
    const len = this.freqBins.length;
    const bassEnd = Math.min(6, len);
    const totalEnd = Math.min(48, len);
    let bassSum = 0;
    let totalSum = 0;
    for (let i = 0; i < totalEnd; i++) {
      const v = this.freqBins[i];
      totalSum += v;
      if (i < bassEnd) bassSum += v;
    }
    return {
      bass: bassEnd > 0 ? bassSum / (bassEnd * 255) : 0,
      overall: totalEnd > 0 ? totalSum / (totalEnd * 255) : 0,
    };
  }

  private bindDeck(id: DeckId, el: HTMLAudioElement | null) {
    if (!el || !this.ctx || !this.lowFilter) return;
    let entry = this.wired.get(el);
    if (!entry) {
      const src = this.ctx.createMediaElementSource(el);
      const gain = this.ctx.createGain();
      src.connect(gain);
      gain.connect(this.lowFilter);
      entry = { src, gain };
      this.wired.set(el, entry);
    }
    el.volume = 1;
    this.deckGains[id] = entry.gain;
  }

  private bindUnlockListeners() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.ctx || this.ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
        this.unlockBound = false;
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  /** Ensure AudioContext + Biquad EQ nodes are wired and resumed inside user gestures. */
  ensureGraph(): boolean {
    if (this.fallbackOnly) return false;

    if (!this.graphReady) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) {
          this.fallbackOnly = true;
          return false;
        }
        const ctx = new AudioCtx();
        const low = ctx.createBiquadFilter();
        low.type = 'lowshelf';
        low.frequency.value = 100;

        const mid = ctx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 1000;
        mid.Q.value = 1.0;

        const high = ctx.createBiquadFilter();
        high.type = 'highshelf';
        high.frequency.value = 8000;

        const normalizer = ctx.createDynamicsCompressor();
        normalizer.knee.value = 24;
        normalizer.attack.value = 0.008;
        normalizer.release.value = 0.25;

        const normalizerMakeup = ctx.createGain();
        normalizerMakeup.gain.value = 1;

        const master = ctx.createGain();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;

        low.connect(mid);
        mid.connect(high);
        high.connect(normalizer);
        normalizer.connect(normalizerMakeup);
        normalizerMakeup.connect(master);
        master.connect(analyser);
        analyser.connect(ctx.destination);

        this.ctx = ctx;
        this.lowFilter = low;
        this.midFilter = mid;
        this.highFilter = high;
        this.normalizer = normalizer;
        this.normalizerMakeup = normalizerMakeup;
        this.masterGain = master;
        this.analyser = analyser;
        this.freqBins = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        this.graphReady = true;

        this.bindDeck('a', this.decks.a);
        this.bindDeck('b', this.decks.b);
        this.applyEqToNodes();
        this.applyNormalizerToNodes();
        this.applyGains();
      } catch {
        this.fallbackOnly = true;
        this.syncFallbackVolumes();
        return false;
      }
    } else {
      this.bindDeck('a', this.decks.a);
      this.bindDeck('b', this.decks.b);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
      this.bindUnlockListeners();
    }
    return true;
  }

  setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.applyGains();
  }

  setSleepAttenuation(factor: number) {
    this.sleepAttenuation = Math.max(0, Math.min(1, factor));
    this.applyGains();
  }

  setEqBands(bands: EqBands) {
    this.eqBands = {
      low: clampGain(bands.low),
      mid: clampGain(bands.mid),
      high: clampGain(bands.high),
    };
    this.applyEqToNodes();
  }

  setLoudnessNormalization(enabled: boolean) {
    this.loudnessNormEnabled = enabled;
    this.applyNormalizerToNodes();
  }

  /** Immediately stop any ongoing fade and give exclusive unity gain to the chosen deck. */
  cancelFade(activeDeck: DeckId = this.activeDeck) {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.fadeDoneTimer) {
      clearTimeout(this.fadeDoneTimer);
      this.fadeDoneTimer = null;
    }
    this.activeDeck = activeDeck;
    const other: DeckId = activeDeck === 'a' ? 'b' : 'a';
    this.deckMix[activeDeck] = 1;
    this.deckMix[other] = 0;

    const inactiveEl = this.decks[other];
    if (inactiveEl) {
      inactiveEl.pause();
      inactiveEl.removeAttribute('src');
      inactiveEl.load();
    }
    this.applyGains();
  }

  /** Crossfade from outgoing deck to incoming deck over `seconds`. */
  crossfadeTo(incoming: DeckId, seconds: number) {
    if (seconds <= 0) {
      this.cancelFade(incoming);
      return;
    }
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    if (this.fadeDoneTimer) clearTimeout(this.fadeDoneTimer);

    const outgoing: DeckId = incoming === 'a' ? 'b' : 'a';
    this.activeDeck = incoming;
    this.deckMix[incoming] = 0.001;
    this.deckMix[outgoing] = 1;
    this.applyGains();

    const durationMs = seconds * 1000;
    const startedAt = performance.now();

    this.fadeTimer = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const t = Math.min(1, elapsed / durationMs);
      this.deckMix[incoming] = Math.sin((t * Math.PI) / 2);
      this.deckMix[outgoing] = Math.cos((t * Math.PI) / 2);
      this.applyGains();
      if (t >= 1 && this.fadeTimer) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      }
    }, 30);

    this.fadeDoneTimer = setTimeout(() => {
      this.fadeDoneTimer = null;
      this.cancelFade(incoming);
    }, durationMs + 80);
  }

  private applyEqToNodes() {
    if (!this.ctx || !this.lowFilter || !this.midFilter || !this.highFilter) return;
    const now = this.ctx.currentTime;
    this.lowFilter.gain.setTargetAtTime(this.eqBands.low, now, 0.03);
    this.midFilter.gain.setTargetAtTime(this.eqBands.mid, now, 0.03);
    this.highFilter.gain.setTargetAtTime(this.eqBands.high, now, 0.03);
  }

  private applyNormalizerToNodes() {
    if (!this.graphReady || !this.ctx || !this.normalizer || !this.normalizerMakeup) return;
    const now = this.ctx.currentTime;
    if (this.loudnessNormEnabled) {
      this.normalizer.threshold.setTargetAtTime(-18, now, 0.04);
      this.normalizer.ratio.setTargetAtTime(4, now, 0.04);
      this.normalizerMakeup.gain.setTargetAtTime(1.18, now, 0.04);
    } else {
      this.normalizer.threshold.setTargetAtTime(0, now, 0.04);
      this.normalizer.ratio.setTargetAtTime(1, now, 0.04);
      this.normalizerMakeup.gain.setTargetAtTime(1, now, 0.04);
    }
  }

  private applyGains() {
    if (this.graphReady && this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.masterVolume * this.sleepAttenuation, now, 0.02);
      if (this.deckGains.a) {
        this.deckGains.a.gain.setTargetAtTime(this.deckMix.a, now, 0.02);
      }
      if (this.deckGains.b) {
        this.deckGains.b.gain.setTargetAtTime(this.deckMix.b, now, 0.02);
      }
    } else {
      this.syncFallbackVolumes();
    }
  }

  private syncFallbackVolumes() {
    if (this.graphReady) return;
    const eff = this.masterVolume * this.sleepAttenuation;
    if (this.decks.a) this.decks.a.volume = Math.max(0, Math.min(1, eff * this.deckMix.a));
    if (this.decks.b) this.decks.b.volume = Math.max(0, Math.min(1, eff * this.deckMix.b));
  }
}

export const audioEngine = new AudioEngine();
