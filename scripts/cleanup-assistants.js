// Cleanup script - delete all assistants so app can create fresh "Default Assistant"
// Run with: node scripts/cleanup-assistants.js YOUR_API_KEY

const apiKey = process.argv[2];

if (!apiKey) {
  console.log('Usage: node scripts/cleanup-assistants.js YOUR_API_KEY');
  process.exit(1);
}

async function cleanup() {
  try {
    // Get all assistants
    const response = await fetch('https://app.backboard.io/api/assistants', {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('API Error:', response.status, await response.text());
      return;
    }

    const assistants = await response.json();

    if (assistants.length === 0) {
      console.log('No assistants to delete.');
      return;
    }

    console.log(`\nFound ${assistants.length} assistant(s). Deleting...\n`);

    for (const assistant of assistants) {
      console.log(`Deleting: ${assistant.name} (${assistant.assistant_id})`);

      const deleteResponse = await fetch(
        `https://app.backboard.io/api/assistants/${assistant.assistant_id}`,
        {
          method: 'DELETE',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (deleteResponse.ok) {
        console.log('  ✓ Deleted');
      } else {
        console.log('  ✗ Failed:', await deleteResponse.text());
      }
    }

    console.log('\n=== Cleanup Complete ===');
    console.log('\nNext steps:');
    console.log('1. Clear browser localStorage: localStorage.removeItem("backboard-assistant-store")');
    console.log('2. Reload the app - it will create "Default Assistant" automatically');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

cleanup();
