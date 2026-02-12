// Direct API approach - bypasses triggers
const SUPABASE_URL = 'https://klbqrnwsmrxuzmficesc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYnFybndzbXJ4dXptZmljZXNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgzNDk2OSwiZXhwIjoyMDg2NDEwOTY5fQ.zTqBZUKt-A_rmqxoLHzdOBTVlj1dYAS-DmPDaMQ848U';

async function createUserDirect() {
  try {
    // Try using GoTrue API directly
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'alice.test@example.com',
        password: 'demo123',
        email_confirm: true,
        app_metadata: {},
        user_metadata: {}
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Success! User created:', result.email);
      console.log('User ID:', result.id);
    } else {
      console.log('❌ Failed:', result);
      console.log('\nFull response:', JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

createUserDirect();
