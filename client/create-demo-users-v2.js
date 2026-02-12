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
  { email: 'alice.johnson@school.edu', password: 'demo123', role: 'teacher', username: 'Alice Johnson', vark: { visual: 30, auditory: 25, reading_writing: 25, kinesthetic: 20 } },
  { email: 'bob.smith@school.edu', password: 'demo123', role: 'student', username: 'Bob Smith', vark: { visual: 40, auditory: 15, reading_writing: 20, kinesthetic: 25 } },
  { email: 'carol.white@school.edu', password: 'demo123', role: 'student', username: 'Carol White', vark: { visual: 20, auditory: 35, reading_writing: 25, kinesthetic: 20 } },
  { email: 'david.brown@school.edu', password: 'demo123', role: 'student', username: 'David Brown', vark: { visual: 25, auditory: 20, reading_writing: 35, kinesthetic: 20 } },
];

async function createUsers() {
  console.log('Creating demo users...\n');

  for (const user of users) {
    try {
      // Create auth user (without specifying ID - let Supabase generate it)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role,
          username: user.username
        }
      });

      if (authError) {
        console.log(`❌ ${user.email}: ${authError.message}`);
        continue;
      }

      console.log(`✅ ${user.email}: Auth user created (ID: ${authData.user.id})`);

      // Create/update profile with VARK scores
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          vark_visual: user.vark.visual,
          vark_auditory: user.vark.auditory,
          vark_reading_writing: user.vark.reading_writing,
          vark_kinesthetic: user.vark.kinesthetic,
          verification_status: 'verified'
        });

      if (profileError) {
        console.log(`   ⚠️  Profile error: ${profileError.message}`);
      } else {
        console.log(`   ✅ Profile created with VARK scores`);
      }

    } catch (err) {
      console.log(`❌ ${user.email}: ${err.message}`);
    }
  }

  console.log('\n✨ Done! You can now sign in with:');
  console.log('   Teacher: alice.johnson@school.edu / demo123');
  console.log('   Student: bob.smith@school.edu / demo123');
}

createUsers();
