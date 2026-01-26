const { startScheduler } = require('./scheduler');

/**
 * Main application entry point
 */
async function main() {
  console.log('=== Payment Notification System ===');
  console.log(`Started at: ${new Date().toISOString()}`);
  
  try {
    // Start the scheduler
    startScheduler();
    
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
