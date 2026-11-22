import { APP_VERSION } from './desktop';

export const LAST_SEEN_VERSION_KEY = 'ohm_last_seen_version';

export interface ChangelogRelease {
  version: string;
  label: string;
  items: string[];
}

export const LATEST_RELEASE: ChangelogRelease = {
  version: APP_VERSION,
  label: 'Latest',
  items: [
    'Global Explore & smart local blend: Explore, New releases, and Charts now default to Global/Western music and automatically weave in regional picks based on your listening.',
    'Dynamic Song Radio: starting radio from the same song explores fresh tracks instead of repeating the same order.',
    'Real Artist portraits & crisp thumbnails: Artists view loads real artist photos, and YouTube thumbnails crop out black letterbox bars cleanly.',
    'Discord Rich Presence v2: shows album info cleanly, adds Download Ohm & Listen to Track buttons, and defaults to on.',
    'Quality of life: Recently played time grouping, Queue Shuffle upcoming, Undo toast for Clear queue & Delete playlist, and paused background animations when unfocused.',
  ],
};
