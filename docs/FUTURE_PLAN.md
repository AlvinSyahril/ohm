# Ohm Future Plan & Product Roadmap

Living backlog of product ideas and UX upgrades for Ohm, kept lean and focused on high-value daily-driver features.

---

## Shipped

### 1. One-Click "Lyric Moment" Card Studio
- Contiguous 1–4 line selection inside `LyricsPanel` with one-tap **Best part** chorus/hook recommendations and 60fps header transitions.
- Live Canvas Studio modal (`LyricCardModal`) with **Cover Palette**, **Obsidian Matte**, and **Editorial Paper** themes, **Match album vibe** palette extraction, mixed sans + italic serif accents, **Ohm** vector lockup, `4:5` / `1:1` / `9:16 Story` (floating over ambient backdrop), `ROUNDED` / `SQUARE (IG)` corners, and CORS-safe `/api/artwork` proxy.

### 2. "Your Sound Receipt" / On-Demand Listening Card
- Local-first play tracking (`ohm_play_events` in `localStorage`) computing Top 5 Tracks, Top Artist, Play Count, and Total Playtime across **This Week** and **All Time**.
- Export modal (`SoundReceiptModal`, accessible from the Sidebar and mobile Library drawer) with **Thermal Receipt** and **Obsidian Studio** themes ready for PNG download or clipboard copy.

### 3. Desktop "Now Vibing" Status (Discord Rich Presence)
- Zero-dependency `node:net` Discord IPC client (`src/electron/discordRpc.ts`) publishing `Listening to Ohm` with track title, artist, album cover art, and live progress timestamps.
- Electron-only toggle, live connection status, and optional custom Client ID override inside **About** (`AboutModal.tsx`), with Ohm's Application ID built in as default.

### 4. Loudness Normalization
- Web Audio `DynamicsCompressorNode` + gentle makeup gain stage wired cleanly before `masterGain` in `src/client/audio/audioEngine.ts` with glitch-free bypass ramping.
- Persisted toggle inside the **Audio Tuning** popover (`FloatingPlayerDeck.tsx`).

---

## Core Reliability & Desktop Backlog

- **Library Backup (JSON Export / Import):** Export/restore `favorites`, `playlists`, `ohm_play_events`, and preferences from the About modal so local libraries survive device swaps.
- **Per-Track Lyric Sync Offset + Stage FX Toggle:** Quick `-0.5s / +0.5s` lyric timing nudge (saved per `videoId`) and a header toggle in `StageOverlay` for Ember Drift particles.
- **Desktop Mini-Player & Windows Taskbar Controls:** Compact always-on-top window mode (`~360x110`) plus Windows taskbar hover media buttons (`setThumbarButtons`).
- **Playlist Drag-to-Reorder & Queue Shuffle Upcoming:** Bring `QueueDrawer`-style drag reordering to custom playlists in `SongsView` and add a "Shuffle upcoming" action in the Queue header.
- **Toast Undo for Destructive Actions:** Add a quick `Undo` button in toasts after `Clear queue` or `Delete playlist`.
- **`Ctrl+K` Quick Command Palette:** Upgrade `Ctrl/Cmd+K` into a keyboard jump palette for playlists, liked songs, views, EQ presets, and playback actions while keeping `/` dedicated to music search.
