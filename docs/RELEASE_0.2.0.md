# Ohm v0.2.0 Release Notes

## What's New

- **Lyric Moment Card Studio:** Pick 1–4 lines directly inside Stage Lyrics (or hit **Best part** to jump straight to the hook), choose **Cover Palette**, **Obsidian Matte**, or **Editorial Paper**, toggle **Match album vibe**, and export `4:5`, `1:1`, or `9:16` PNGs for Stories or Posts.
- **Your Sound Receipt:** Turns your local listening history (*This Week* or *All Time*) into a shareable **Thermal Receipt** or **Obsidian Studio** card right from the sidebar.
- **Discord Rich Presence:** Optional desktop toggle inside **About** to display your current track, artist, album art, and live progress on Discord (`Listening to Ohm`).
- **Loudness Normalization:** Optional audio leveler in **Audio Tuning** to keep volume consistent between quiet live tracks and loud studio masters.

## Fixes & Improvements

- Fixed `0:00` durations in Explore feeds and added paginated search tabs (`All`, `Songs`, `Albums`, `Artists`, `Playlists`).
- Fixed 4:3 thumbnail letterbox cropping, made multi-artist credits clickable, and cleaned up borderless UI spacing.
- Fixed volume mute/unmute edge cases and cut unnecessary React re-renders during playback for smoother scrolling and lower CPU usage.
- Migrated update checks and links to the standalone `AlvinSyahril/ohm` repository.
