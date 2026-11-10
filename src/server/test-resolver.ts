import { searchTracks, getStreamUrl } from './resolvers/youtube.js';

async function runTest() {
  console.log('Testing Nuclear Redesign Stream Resolver...');
  console.log('1. Searching for "Daft Punk - Get Lucky"...');

  const tracks = await searchTracks('Daft Punk - Get Lucky');
  console.log(`Found ${tracks.length} tracks.`);
  
  if (tracks.length === 0) {
    throw new Error('No tracks found.');
  }

  const firstTrack = tracks[0];
  console.log('Top Track Result:');
  console.log(`  ID: ${firstTrack.id}`);
  console.log(`  Title: ${firstTrack.title}`);
  console.log(`  Artist: ${firstTrack.artist}`);
  console.log(`  Duration: ${firstTrack.duration}s`);
  console.log(`  Thumbnail: ${firstTrack.thumbnail}`);

  console.log('\n2. Resolving direct audio stream URL with automatic deciphering...');
  const streamInfo = await getStreamUrl(firstTrack.id);
  console.log('Stream Resolved Successfully:');
  console.log(`  Format: ${streamInfo.format}`);
  console.log(`  Bitrate: ${streamInfo.bitrate} bps`);
  console.log(`  Direct Stream URL prefix: ${streamInfo.url.substring(0, 100)}...`);
  console.log('\nAll functional tests passed!');
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
