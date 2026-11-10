import { searchTracks, getStreamUrl, getAudioStream } from './resolvers/youtube.js';

async function runVerification() {
  console.log('1. Testing search for "Daft Punk Justice Synthwave"...');
  const tracks = await searchTracks('Daft Punk Justice Synthwave');
  if (tracks.length === 0) throw new Error('Search returned 0 tracks');
  console.log(`Found ${tracks.length} tracks. First track: ${tracks[0].title} (${tracks[0].id})`);

  console.log('\n2. Regression Test: Resolving & Streaming "Defragment" (a0EkhnHNK-o)...');
  const t0 = Date.now();
  const stream1 = await getAudioStream('a0EkhnHNK-o', { start: 0, end: 4096 });
  console.log(`Initial stream HTTP status: ${stream1.status} (${Date.now() - t0}ms)`);
  if (stream1.status !== 206 && stream1.status !== 200) {
    throw new Error(`Expected 206/200, got ${stream1.status}`);
  }

  console.log('\n3. Testing cached seek Range request (bytes=3000000-3004096)...');
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
