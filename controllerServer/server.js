const { startEndpointScheduler } = require('./scheduler');
const { getActiveTags, getAllEndpoints } = require('./endpoints-store');

/**
 * Get current time in Asia/Dhaka timezone
 */
function getDhakaTime() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date()).replace(/(\d+)\/(\d+)\/(\d+),?\s?(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
}

/**
 * Main application entry point
 */
async function main() {
  console.log('=== Notification System (Dhaka) ===');
  console.log(`Started at: ${getDhakaTime()}\n`);

  try {
    // Start schedulers for ACTIVE endpoints only
    const activeTags = getActiveTags();
    const allEndpoints = getAllEndpoints();
    const allTags = Object.keys(allEndpoints);

    console.log(`📋 Found ${allTags.length} endpoint(s): ${allTags.join(', ')}\n`);

    if (activeTags.length > 0) {
      console.log(`🚀 Starting schedulers for ${activeTags.length} ACTIVE endpoint(s)...\n`);
      activeTags.forEach(tag => {
        try {
          startEndpointScheduler(tag);
          console.log(`   ✓ Started scheduler for: ${tag}`);
        } catch (error) {
          console.error(`   ✗ Failed to start scheduler for ${tag}:`, error.message);
        }
      });
      console.log('\n✅ All endpoint schedulers started successfully!\n');
    } else {
      if (allTags.length > 0) {
        console.log(`⚠️  No active endpoints configured. Available: ${allTags.join(', ')}`);
        console.log('Use /endpoints/ui to activate endpoints\n');
      } else {
        console.log('⚠️  No endpoints configured yet.\n');
      }
    }

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n[SIGINT] Shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n[SIGTERM] Shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start the application
main();
