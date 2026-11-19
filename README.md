# Ohm

**Ohm** is a quiet, ad-free desktop music player I built because most streaming apps feel bloated.

It plays clean audio with dual-deck crossfading, a 3-band EQ, loudness normalization, and synced lyrics plus built-in **Lyric Card** and **Sound Receipt** exporters when you want to share a line without taking a messy screenshot.

---

## Features

- **Clean streaming & discovery:** Search tracks, albums, and artists, browse trending explore feeds, and keep listening with Smart Radio autoplay queues.
- **Audio tuning:** Dual-deck crossfade (`3s` / `6s`), Balanced / Warm Bass / Clear Vocals / Late Night / Custom 3-band EQ, loudness normalization, and a gradual sleep timer.
- **Synced lyrics & Stage view:** Click any synced line to jump straight there, or switch into **Share lyric** mode with one-tap **Best part** hook detection.
- **Lyric Moment Card Studio:** Export `4:5 Post`, `1:1 Square`, or `9:16 Story` PNGs in **Cover Palette**, **Obsidian Matte**, or **Editorial Paper** (with **Match album vibe** palette extraction).
- **Your Sound Receipt:** 100% local listening stats (`This Week` / `All Time`) exported as **Thermal Receipt** or **Obsidian Studio** PNG cards.
- **Desktop integration:** Windows system tray playback controls, in-app update checks, and optional **Discord Rich Presence** (`Listening to Ohm`).

---

## Download (Windows)

Download the latest Windows installer (`Ohm-Setup-*.exe`) directly from **[nexorastudio.my.id/apps/ohm](https://www.nexorastudio.my.id/apps/ohm)** (or grab it from the [GitHub Releases](https://github.com/AlvinSyahril/ohm/releases) mirror).

---

## Development

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

---

## License & Author

Built by [Alvin Syahril (@vinnssmokee)](https://www.instagram.com/vinnssmokee).
