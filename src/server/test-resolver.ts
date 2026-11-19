import {
  searchAll,
  searchTracks,
  searchTracksPaginated,
  searchAlbumsPaginated,
  searchArtistsPaginated,
  searchPlaylistsPaginated,
  getExploreFeed,
  getExploreCategory,
  getStreamUrl,
  getAudioStream,
} from './resolvers/youtube.js';

async function runVerification() {
  console.log('1. Testing paginated search for "lofi" (breaking 20-track limit)...');
  const page1 = await searchTracksPaginated('lofi', 0);
  if (page1.tracks.length <= 20) {
    throw new Error(`Expected > 20 tracks from paginated search, got ${page1.tracks.length}`);
  }
  console.log(`Initial search returned ${page1.tracks.length} tracks (hasMore=${page1.hasMore}).`);

  if (page1.hasMore) {
    const page2 = await searchTracksPaginated('lofi', page1.tracks.length);
    if (page2.tracks.length === 0) {
      throw new Error('Expected additional tracks on Load More');
    }
    const p1Ids = new Set(page1.tracks.map((t) => t.id));
    const overlap = page2.tracks.filter((t) => p1Ids.has(t.id));
    if (overlap.length > 0) {
      throw new Error(`Found ${overlap.length} duplicate track IDs across search pages`);
    }
    console.log(`Load More returned ${page2.tracks.length} unique additional tracks.`);
  }

  console.log('\n2. Testing Explore feed & category durations (no 0:00 durations)...');
  const feed = await getExploreFeed();
  if (feed.trendingTracks.length === 0) throw new Error('Explore returned 0 trending tracks');
  const missingTrendingDur = feed.trendingTracks.filter((t) => !t.duration || t.duration <= 0);
  if (missingTrendingDur.length > 0) {
    throw new Error(
      `Explore trending had ${missingTrendingDur.length}/${feed.trendingTracks.length} tracks without duration`
    );
  }
  const leakedViews = feed.trendingTracks.filter((t) => t.artist.includes('views'));
  if (leakedViews.length > 0) {
    throw new Error(`Explore trending leaked view count into artist: ${leakedViews[0].artist}`);
  }
  console.log(
    `Explore trending: ${feed.trendingTracks.length} tracks, all with valid durations (sample: ${feed.trendingTracks[0].title} - ${feed.trendingTracks[0].duration}s).`
  );

  const newReleases = await getExploreCategory({
    browseId: 'FEmusic_new_releases',
    title: 'New releases',
  });
  const missingCatDur = newReleases.tracks
    .slice(0, 20)
    .filter((t) => !t.duration || t.duration <= 0);
  if (newReleases.tracks.length > 0 && missingCatDur.length > 0) {
    throw new Error(
      `New releases had ${missingCatDur.length} tracks without duration`
    );
  }
  console.log(`Explore New releases tracks checked: ${newReleases.tracks.length} tracks.`);

  console.log('\n3. Testing multi-type search ("linkin park": All / Albums / Artists / Playlists)...');
  const allRes = await searchAll('linkin park');
  if (!allRes.topResult) throw new Error('searchAll returned no topResult');
  if (allRes.tracks.length === 0 || allRes.albums.length === 0 || allRes.artists.length === 0 || allRes.playlists.length === 0) {
    throw new Error(
      `searchAll incomplete: tracks=${allRes.tracks.length}, albums=${allRes.albums.length}, artists=${allRes.artists.length}, playlists=${allRes.playlists.length}`
    );
  }
  const albPage1 = await searchAlbumsPaginated('linkin park', 0);
  const artPage1 = await searchArtistsPaginated('linkin park', 0);
  const plPage1 = await searchPlaylistsPaginated('linkin park', 0);
  if (albPage1.items.length === 0 || artPage1.items.length === 0 || plPage1.items.length === 0) {
    throw new Error('Typed search returned empty items');
  }
  console.log(
    `All topResult=${allRes.topResult.kind}, albums=${albPage1.items.length}, artists=${artPage1.items.length}, playlists=${plPage1.items.length}.`
  );

  console.log('\n4. Testing searchTracks("Daft Punk Justice Synthwave")...');
  const tracks = await searchTracks('Daft Punk Justice Synthwave');
  if (tracks.length === 0) throw new Error('Search returned 0 tracks');
  console.log(`Found ${tracks.length} tracks. First track: ${tracks[0].title} (${tracks[0].id})`);

  console.log('\n5. Regression Test: Resolving & Streaming "Defragment" (a0EkhnHNK-o)...');
  const t0 = Date.now();
  const stream1 = await getAudioStream('a0EkhnHNK-o', { start: 0, end: 4096 });
  console.log(`Initial stream HTTP status: ${stream1.status} (${Date.now() - t0}ms)`);
  if (stream1.status !== 206 && stream1.status !== 200) {
    throw new Error(`Expected 206/200, got ${stream1.status}`);
  }

  console.log('\n6. Testing cached seek Range request (bytes=3000000-3004096)...');
  const t1 = Date.now();
  const cachedInfo = await getStreamUrl('a0EkhnHNK-o');
  const cacheLookupMs = Date.now() - t1;
  console.log(`Cache lookup time: ${cacheLookupMs}ms (Client: ${cachedInfo.clientUsed})`);

  const stream2 = await getAudioStream('a0EkhnHNK-o', { start: 3000000, end: 3004096 });
  console.log(`Seek stream HTTP status: ${stream2.status}`);
  if (stream2.status !== 206 && stream2.status !== 200) {
    throw new Error(`Seek failed with status ${stream2.status}`);
  }

  console.log('\nAll regression and stream tests passed!');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
