export interface LyricHighlightInput {
  timeMs?: number;
  text: string;
}

export type RecommendationReason = 'Chorus hook' | 'Peak refrain' | 'Standout stanza';

export interface LyricMomentRecommendation {
  indices: number[];
  reason: RecommendationReason;
  score: number;
}

const SECTION_TAG_RE = /^[\[\(](verse|chorus|bridge|intro|outro|pre-chorus|hook|instrumental|solo|refrain|interlude)[\s\d:\-]*[\]\)]$/i;
const VOCAL_FILLER_RE = /^(oh+|ah+|ooh+|yeah+|uh+|la+|na+|da+|hm+|mm+)([\s,]+(oh+|ah+|ooh+|yeah+|uh+|la+|na+|da+|hm+|mm+))*$/i;

function normalizeLine(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\[\(].*?[\]\)]/g, ' ')
    .replace(/[^\p{L}\p{N}\s']/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUsableLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (SECTION_TAG_RE.test(trimmed)) return false;
  return normalizeLine(trimmed).length > 0;
}

export function findBestLyricMoments(
  lines: LyricHighlightInput[],
  maxResults = 3
): LyricMomentRecommendation[] {
  const usableIndices: number[] = [];
  const normalizedByIdx = new Map<number, string>();
  const lineFreq = new Map<string, number>();

  for (let i = 0; i < lines.length; i += 1) {
    if (!isUsableLine(lines[i].text)) continue;
    const norm = normalizeLine(lines[i].text);
    usableIndices.push(i);
    normalizedByIdx.set(i, norm);
    lineFreq.set(norm, (lineFreq.get(norm) ?? 0) + 1);
  }

  if (usableIndices.length === 0) return [];
  if (usableIndices.length === 1) {
    return [{ indices: [usableIndices[0]], reason: 'Standout stanza', score: 10 }];
  }

  // Count 2-line pair repetitions to detect multi-line choruses reliably
  const pairFreq = new Map<string, number>();
  for (let k = 0; k < usableIndices.length - 1; k += 1) {
    const a = normalizedByIdx.get(usableIndices[k]) ?? '';
    const b = normalizedByIdx.get(usableIndices[k + 1]) ?? '';
    const key = `${a}|${b}`;
    pairFreq.set(key, (pairFreq.get(key) ?? 0) + 1);
  }

  const candidates: LyricMomentRecommendation[] = [];
  const totalUsable = usableIndices.length;

  for (let startPos = 0; startPos < totalUsable; startPos += 1) {
    for (const winLen of [2, 3, 4]) {
      if (startPos + winLen > totalUsable) continue;
      const windowIndices = usableIndices.slice(startPos, startPos + winLen);

      // Avoid spanning across large blank-line gaps or long instrumental breaks
      let hasLargeGap = false;
      for (let j = 0; j < windowIndices.length - 1; j += 1) {
        const curIdx = windowIndices[j];
        const nextIdx = windowIndices[j + 1];
        if (nextIdx - curIdx > 2) {
          hasLargeGap = true;
          break;
        }
        const t1 = lines[curIdx].timeMs;
        const t2 = lines[nextIdx].timeMs;
        if (typeof t1 === 'number' && typeof t2 === 'number' && t2 - t1 > 12_000) {
          hasLargeGap = true;
          break;
        }
      }
      if (hasLargeGap) continue;

      const joinedText = windowIndices.map((idx) => lines[idx].text.trim()).join(' ');
      const charLen = joinedText.length;

      let freqSum = 0;
      let maxPairCount = 1;
      let fillerCount = 0;

      for (let j = 0; j < windowIndices.length; j += 1) {
        const idx = windowIndices[j];
        const norm = normalizedByIdx.get(idx) ?? '';
        freqSum += lineFreq.get(norm) ?? 1;
        if (VOCAL_FILLER_RE.test(norm)) fillerCount += 1;

        if (j < windowIndices.length - 1) {
          const nextNorm = normalizedByIdx.get(windowIndices[j + 1]) ?? '';
          const pCount = pairFreq.get(`${norm}|${nextNorm}`) ?? 1;
          if (pCount > maxPairCount) maxPairCount = pCount;
        }
      }

      const avgFreq = freqSum / winLen;
      let score = 0;

      // Repetition signal
      if (avgFreq > 1) score += (avgFreq - 1) * 28;
      if (maxPairCount > 1) score += (maxPairCount - 1) * 34;

      // Readability & card fit
      if (charLen >= 38 && charLen <= 145) score += 24;
      else if (charLen >= 22 && charLen <= 185) score += 12;
      else score -= 12;

      if (winLen === 2 || winLen === 3) score += 10;
      if (fillerCount > 0) score -= fillerCount * 16;

      // Position signal: favor central chorus/bridge zones over very first/last lines
      const relPos = (startPos + winLen / 2) / totalUsable;
      if (relPos >= 0.2 && relPos <= 0.8) score += 12;
      if (startPos === 0 || startPos + winLen === totalUsable) score -= 8;

      if (/[?!]/.test(joinedText)) score += 6;

      const reason: RecommendationReason =
        maxPairCount >= 2 ? 'Chorus hook' : avgFreq >= 1.75 ? 'Peak refrain' : 'Standout stanza';

      candidates.push({ indices: windowIndices, reason, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const picked: LyricMomentRecommendation[] = [];
  for (const cand of candidates) {
    const overlapsExisting = picked.some((existing) => {
      const overlap = cand.indices.filter((idx) => existing.indices.includes(idx)).length;
      return overlap >= Math.min(cand.indices.length, existing.indices.length) * 0.5;
    });
    if (!overlapsExisting) {
      picked.push(cand);
      if (picked.length >= maxResults) break;
    }
  }

  return picked;
}
