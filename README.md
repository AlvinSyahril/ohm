<div align="center">
  <img src="public/ohm-icon.svg" alt="Ohm logo" width="76" height="76" />
  <h1>Ohm</h1>
  <p><strong>A quiet, ad-free desktop music player for Windows.</strong></p>
  <p>Clean streaming, synced lyrics, custom sound tuning, Discord Rich Presence, and built-in lyric &amp; receipt card exports.</p>

  <p>
    <a href="https://www.nexorastudio.my.id/apps/ohm">
      <img src="https://img.shields.io/badge/Download-Windows%20(.exe)-2eb872?style=for-the-badge" alt="Download for Windows" />
    </a>
    <a href="https://github.com/AlvinSyahril/ohm/releases">
      <img src="https://img.shields.io/badge/GitHub-Releases-181b19?style=for-the-badge" alt="GitHub Releases" />
    </a>
  </p>
</div>

---

## Why Ohm

Most music apps feel loud, cluttered, and stuffed with feeds you never asked for. **Ohm** strips it back to what actually matters when you put headphones on: fast search, smooth audio transitions, readable synced lyrics, and a clean way to share lines you care about without taking messy screenshots.

## Highlights

- **Zero-clutter streaming:** Search tracks, albums, and artists, explore trending releases, and keep listening with Smart Radio autoplay queues.
- **Built-in sound tuning:** Dual-deck crossfading (`3s` / `6s`), EQ presets (*Balanced*, *Warm Bass*, *Clear Vocals*, *Late Night*, or *Custom*), loudness normalization, and a gradual sleep timer.
- **Stage view &amp; Synced lyrics:** Click any line to jump straight to that moment, or tap **Share lyric** with one-click **Best part** chorus detection.
- **Lyric Moment Card Studio:** Export clean `4:5 Post`, `1:1 Square`, or `9:16 Story` PNGs in **Cover Palette**, **Obsidian Matte**, or **Editorial Paper** tuned to the album artwork.
- **Your Sound Receipt:** Local listening stats (*This Week* / *All Time*) turned into **Thermal Receipt** or **Obsidian Studio** cards ready for Instagram Stories.
- **Desktop native:** Windows system tray controls, in-app updates, and optional **Discord Rich Presence** (`Listening to Ohm`).

---

## Install (Windows)

1. Download the latest `Ohm-Setup-*.exe` from **[nexorastudio.my.id/apps/ohm](https://www.nexorastudio.my.id/apps/ohm)** (or the [GitHub Releases](https://github.com/AlvinSyahril/ohm/releases) mirror).
2. Run the installer and open **Ohm**.

---

<details>
<summary><strong>Build from source (for developers)</strong></summary>

Requires **Node.js 20+** and **pnpm**.

```bash
# Install dependencies
pnpm install

# Run backend API (http://127.0.0.1:4000) and Vite frontend (http://localhost:5173)
pnpm run server:dev
pnpm run dev

# Build and launch the Electron desktop app
pnpm run electron:start

# Build Windows NSIS installer into release/
pnpm run dist:win
```

</details>

---

Built by [Alvin Syahril (@vinnssmokee)](https://www.instagram.com/vinnssmokee).
