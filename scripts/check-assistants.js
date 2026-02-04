// Quick script to check existing assistants in Backboard API
// Run with: node scripts/check-assistants.js YOUR_API_KEY

const apiKey = process.argv[2];

if (!apiKey) {
  console.log('Usage: node scripts/check-assistants.js YOUR_API_KEY');
  process.exit(1);
}

async function checkAssistants() {
  try {
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

    console.log('\n=== Existing Assistants in Backboard ===\n');

    if (assistants.length === 0) {
      console.log('No assistants found.');
    } else {
      assistants.forEach((a, i) => {
        console.log(`${i + 1}. ${a.name}`);
        console.log(`   ID: ${a.assistant_id}`);
        console.log(`   Created: ${a.created_at}`);
        console.log('');
      });
    }

    console.log(`Total: ${assistants.length} assistant(s)`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAssistants();
