import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://klbqrnwsmrxuzmficesc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYnFybndzbXJ4dXptZmljZXNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgzNDk2OSwiZXhwIjoyMDg2NDEwOTY5fQ.zTqBZUKt-A_rmqxoLHzdOBTVlj1dYAS-DmPDaMQ848U';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const users = [
  { id: 'a1111111-1111-1111-1111-111111111111', email: 'alice.johnson@school.edu', password: 'demo123', role: 'teacher', username: 'Alice Johnson' },
  { id: 'a2222222-2222-2222-2222-222222222222', email: 'bob.smith@school.edu', password: 'demo123', role: 'student', username: 'Bob Smith' },
  { id: 'a3333333-3333-3333-3333-333333333333', email: 'carol.white@school.edu', password: 'demo123', role: 'student', username: 'Carol White' },
  { id: 'a4444444-4444-4444-4444-444444444444', email: 'david.brown@school.edu', password: 'demo123', role: 'student', username: 'David Brown' },
];

async function createUsers() {
  console.log('Creating demo users...\n');

  for (const user of users) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role,
          username: user.username
        }
      });

      if (error) {
        console.log(`❌ ${user.email}: ${error.message}`);
      } else {
        console.log(`✅ ${user.email}: Created successfully`);
      }
    } catch (err) {
      console.log(`❌ ${user.email}: ${err.message}`);
    }
  }

  console.log('\n✨ Done! You can now sign in with these accounts.');
}

createUsers();
