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
    'Real Infinity Queue: background autoplay refills always fetch fresh recommendations with an 80-track exclusion memory so long listening sessions keep discovering new songs.',
    'Audio timeout recovery & security: upstream stream timeouts automatically retry with a fresh client, and the local server restricts CORS to localhost/127.0.0.1.',
    'Home & Queue UI polish: real Artist portraits on Home, card-snapped Related shelves, clean song titles, Queue-aware 2-column Selected cuts, uniform Next up controls, and top window hairline.',
    'Playlist drag-to-reorder & lyric sync offset: drag tracks directly to reorder custom playlists, and nudge synced lyric timing (-0.5s / +0.5s) from the collapsible Sync control in Stage.',
    'Discord RPC live status: About updates automatically when Discord opens or closes, with cleaner disconnect and error logging.',
  ],
};
