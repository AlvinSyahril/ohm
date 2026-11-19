import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { splitArtistCredits } from '../utils/catalog';

interface ArtistLinksProps {
  artist: string;
  artistId?: string;
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
}

/**
 * Renders each collaborator in a track's artist credit as an independent clickable link
 * while preserving original separators ("&", ",", "ft.", "feat.") in muted text.
 */
export const ArtistLinks: React.FC<ArtistLinksProps> = ({
  artist,
  artistId,
  className = 'block max-w-full truncate',
  linkClassName = 'hover:text-ink hover:underline transition-colors',
  onNavigate,
}) => {
  const openArtist = usePlayerStore((s) => s.openArtist);
  const credits = splitArtistCredits(artist);

  if (credits.length === 0) return null;

  return (
    <span className={className}>
      {credits.map((credit, idx) => (
        <React.Fragment key={`${credit.name}-${idx}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate?.();
              openArtist(credit.name, idx === 0 ? artistId : undefined);
            }}
            className={`inline text-left ${linkClassName}`}
          >
            {credit.name}
          </button>
          {credit.separatorAfter && (
            <span className="text-ink-3">{credit.separatorAfter}</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
};
