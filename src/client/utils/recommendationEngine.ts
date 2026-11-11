import { Track, Playlist } from '../store/usePlayerStore';

// Verified, high-definition Global Top Hits (Spotify Top 50 & Billboard Hot 100)
export const GLOBAL_TRENDING_TRACKS: Track[] = [
  {
    id: 'DlFXDl_ROAM',
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    album: 'MAYHEM',
    duration: 252,
    thumbnail: 'https://yt3.googleusercontent.com/RFK4wHeGqwI3DndbARbRJB21IC0TcmqnrlyjxYK7T-nC8wlIVbfxNaCIFKNvSpchDKmYyVLe1RN36w=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'WKZO-CWeOVA',
    title: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    duration: 198,
    thumbnail: 'https://yt3.googleusercontent.com/mXJjWX4E6Gpr03CUYl18PdVXlczmoL2Tm-LEBGafIr_8smlHnl8AHniJu0_7Y80e-aeloJxcryQQx0ZJ=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'aB86Ub8dubQ',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    album: 'Short n\' Sweet',
    duration: 175,
    thumbnail: 'https://yt3.googleusercontent.com/fhDgRO0LrPPo9CDqsLQlxR3CVZc8xPmSi9Ja8DKAS5zhoWsZKdj2scyWqBUU2t4DHxK1xcbWKY2Q7cpj=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'UEajTd306bg',
    title: 'Dancing In The Flames',
    artist: 'The Weeknd',
    album: 'Hurry Up Tomorrow',
    duration: 220,
    thumbnail: 'https://yt3.googleusercontent.com/j392achow6M4Fblpf7QmwGxPbkSoxcY4jl23gJRyHALc1AgVRbrw5uvEGHCpFVNz6qU_lsXfiIWQDpA9=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'phLb_SoPBlA',
    title: 'Not Like Us',
    artist: 'Kendrick Lamar',
    album: 'Single',
    duration: 274,
    thumbnail: 'https://yt3.googleusercontent.com/8qk3C_zpd2FXHVN8BpMBFL6h9J5BlKlbcKOlvDMvIgBWBsAblDoTjU98RGbFH9DxtnN1X5zRzc9sSvWr=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'nI6GP8wKJ6o',
    title: '360',
    artist: 'Charli xcx',
    album: 'BRAT',
    duration: 133,
    thumbnail: 'https://yt3.googleusercontent.com/Kg4TDggl5e6Se3FeybP4rm56H94l1FTV2YvowKP7BAuhhGirbHd8H31eprhRJBOR_-hKcIL3ubOpjttCsA=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'VZ-oGLluGAc',
    title: 'Good Luck, Babe!',
    artist: 'Chappell Roan',
    album: 'Single',
    duration: 218,
    thumbnail: 'https://yt3.googleusercontent.com/vB4Sh2i4BvMg5qn9Jt6sy09IsMfX4whFcI2QxDLvYbDIR5jWLJjqM0oyD4U0CiS2ywIj13JQ-U91BaWA=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'PCBZOSM8h5U',
    title: 'I Had Some Help',
    artist: 'Post Malone ft. Morgan Wallen',
    album: 'F-1 Trillion',
    duration: 178,
    thumbnail: 'https://yt3.googleusercontent.com/ISw4iWKYlmgP6to6w4bP6NZSP21ryaQbgpdXdVPcfY5K_seVn_zmM82GGBNW0U6-Cw8fX43u1BBeYPA=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'cCfPDrRQp9k',
    title: 'Houdini',
    artist: 'Dua Lipa',
    album: 'Radical Optimism',
    duration: 185,
    thumbnail: 'https://yt3.googleusercontent.com/5d51ZlGjNP_Gss3Z3RKP7B98ASQ7pxvp4XI3IAQ3kniFFjgLPDPnR6_K3tYZGoMVvfJYXBtu3awwsTI=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'ZqSlV5LmrTg',
    title: 'Snooze',
    artist: 'SZA',
    album: 'SOS',
    duration: 201,
    thumbnail: 'https://yt3.googleusercontent.com/o3i9-dA34xDjbw1hz4nhJO6LA6V4-ZYjs_kh7aUA0sq1pieJejt_Hnor-Rxl77GA1ugAFqxcmEUwy3c=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'LF2LGaCsMbc',
    title: 'MILLION DOLLAR BABY',
    artist: 'Tommy Richman',
    album: 'Single',
    duration: 155,
    thumbnail: 'https://yt3.googleusercontent.com/yaye-gvSo30LmuLiF8uaqBn6Yhjx1R6H92IN93MmeDbrWk-o9WQvHYC2uc0KnvtwtCS3qv2unWnln3iO=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'dEyPelEU4IE',
    title: 'leavemealone',
    artist: 'Fred again.. & Baby Keem',
    album: 'USB',
    duration: 222,
    thumbnail: 'https://yt3.googleusercontent.com/1TeJeBnjkAO509gdLmu4jbgxOevJC0ps3hZ3pjXzvyEQLst19Gj5qp6A7oBj2h7m5pXkiWTNWtzXc51N=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: 'tyd-Vs0MHH4',
    title: '(It Goes Like) Nanana',
    artist: 'Peggy Gou',
    album: 'I Hear You',
    duration: 231,
    thumbnail: 'https://yt3.googleusercontent.com/kufJwHnXkLfIlTe89dA4l70H_OUfUJjb2bdeXX0RmXF1e_lpGq1KGrcChStXTS_3t1sdAxwZjkBIRWVq=w544-h544-l90-rj',
    source: 'youtube',
  },
  {
    id: '8yXGI3kcLsw',
    title: 'Supernatural',
    artist: 'NewJeans',
    album: 'Supernatural',
    duration: 191,
    thumbnail: 'https://yt3.googleusercontent.com/WgBLB8VroyaD3m7DBYo8mnFHDKhBgoqUEBSEbdSbz-U9jP5tY0UzYbGw1q3kFLj7T0ek1PwuN7IVKRQ=w544-h544-l90-rj',
    source: 'youtube',
  },
];

export interface TasteProfile {
  topArtists: string[];
  favoriteCount: number;
  historyCount: number;
  playlistCount: number;
  primaryVibe: string;
  recommendedQueries: {
    sectionTitle: string;
    sectionSubtitle: string;
    query: string;
  }[];
}

/**
 * Analyzes listening history, favorited songs, and custom playlists
 * to compute the user's dynamic taste profile, mirroring the recommendation
 * backbones of Spotify & YouTube Music.
 */
export function analyzeTasteProfile(
  history: Track[],
  favorites: Track[],
  playlists: Playlist[]
): TasteProfile {
  const artistScore: Record<string, number> = {};

  // Favorites carry the highest signal weight (+3)
  for (const track of favorites) {
    if (!track.artist) continue;
    const primaryArtist = track.artist.split(/[&,xX]/)[0].trim();
    artistScore[primaryArtist] = (artistScore[primaryArtist] || 0) + 3;
  }

  // Playlist items carry strong engagement weight (+2)
  for (const pl of playlists) {
    for (const track of pl.tracks) {
      if (!track.artist) continue;
      const primaryArtist = track.artist.split(/[&,xX]/)[0].trim();
      artistScore[primaryArtist] = (artistScore[primaryArtist] || 0) + 2;
    }
  }

  // History tracks carry repeat playback weight (+1.5)
  for (const track of history) {
    if (!track.artist) continue;
    const primaryArtist = track.artist.split(/[&,xX]/)[0].trim();
    artistScore[primaryArtist] = (artistScore[primaryArtist] || 0) + 1.5;
  }

  const sortedArtists = Object.entries(artistScore)
    .sort((a, b) => b[1] - a[1])
    .map(([artist]) => artist);

  const topArtists = sortedArtists.slice(0, 5);

  const recommendedQueries: TasteProfile['recommendedQueries'] = [];

  if (topArtists.length > 0) {
    const top1 = topArtists[0];
    const top2 = topArtists[1] || 'trending';

    recommendedQueries.push({
      sectionTitle: `Mixed For You`,
      sectionSubtitle: `INSPIRED BY ${top1.toUpperCase()} AND YOUR TASTE`,
      query: `${top1} ${top2} top songs official audio`,
    });

    if (topArtists.length >= 2) {
      recommendedQueries.push({
        sectionTitle: `More Like ${top1}`,
        sectionSubtitle: `SIMILAR ARTISTS & VIRAL CURATIONS`,
        query: `${top1} similar artists official music`,
      });
    }
  } else {
    // Cold-start default recommendation queries
    recommendedQueries.push({
      sectionTitle: `Today's Top Hits`,
      sectionSubtitle: `THE BIGGEST SONGS IN THE WORLD RIGHT NOW`,
      query: `Today's Top Hits official audio`,
    });
    recommendedQueries.push({
      sectionTitle: `Viral Streaming Radar`,
      sectionSubtitle: `TRENDING ON TIKTOK AND BILLBOARD CHARTS`,
      query: `viral streaming hits 2025 2026 official`,
    });
  }

  return {
    topArtists,
    favoriteCount: favorites.length,
    historyCount: history.length,
    playlistCount: playlists.length,
    primaryVibe: topArtists[0] || 'Global Pop & Trending',
    recommendedQueries,
  };
}
