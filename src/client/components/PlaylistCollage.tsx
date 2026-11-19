import React from 'react';
import { Music } from 'lucide-react';
import { Track } from '../store/usePlayerStore';
import { TrackArtwork } from './TrackCard';

interface PlaylistCollageProps {
  tracks: Track[];
  className?: string;
}

/**
 * Renders a 2x2 mosaic when 4+ tracks exist, single artwork for 1-3 tracks,
 * or a flat placeholder glyph when empty.
 */
export const PlaylistCollage: React.FC<PlaylistCollageProps> = ({
  tracks,
  className = 'w-[176px] h-[176px]',
}) => {
  if (tracks.length === 0) {
    return (
      <div
        className={`${className} shrink-0 rounded-md bg-raised flex items-center justify-center text-ink-3`}
        aria-hidden
      >
        <Music className="w-14 h-14" />
      </div>
    );
  }

  if (tracks.length < 4) {
    return (
      <div className={`${className} shrink-0 rounded-md overflow-hidden bg-hover`}>
        <TrackArtwork track={tracks[0]} />
      </div>
    );
  }

  return (
    <div className={`${className} shrink-0 rounded-md overflow-hidden bg-hover grid grid-cols-2 grid-rows-2`}>
      {tracks.slice(0, 4).map((t) => (
        <div key={t.id} className="w-full h-full overflow-hidden">
          <TrackArtwork track={t} />
        </div>
      ))}
    </div>
  );
};
