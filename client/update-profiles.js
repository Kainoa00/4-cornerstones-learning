import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://klbqrnwsmrxuzmficesc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYnFybndzbXJ4dXptZmljZXNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgzNDk2OSwiZXhwIjoyMDg2NDEwOTY5fQ.zTqBZUKt-A_rmqxoLHzdOBTVlj1dYAS-DmPDaMQ848U';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateProfiles() {
  console.log('Getting auth users...\n');

  // Get all auth users
  const { data: authData } = await supabase.auth.admin.listUsers();

  const userMap = {
    'alice.johnson@school.edu': { role: 'teacher', username: 'Alice Johnson', vark: [30, 25, 25, 20] },
    'bob.smith@school.edu': { role: 'student', username: 'Bob Smith', vark: [40, 15, 20, 25] },
    'carol.white@school.edu': { role: 'student', username: 'Carol White', vark: [20, 35, 25, 20] },
    'david.brown@school.edu': { role: 'student', username: 'David Brown', vark: [25, 20, 35, 20] }
  };

  for (const user of authData.users) {
    const config = userMap[user.email];
    if (!config) continue;

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      username: config.username,
      role: config.role,
      vark_visual: config.vark[0],
      vark_auditory: config.vark[1],
      vark_reading_writing: config.vark[2],
      vark_kinesthetic: config.vark[3],
      verification_status: 'verified',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.log(`❌ ${user.email}: ${error.message}`);
    } else {
      console.log(`✅ ${user.email}: Profile created`);
    }
  }

  console.log('\n✨ Done! Try signing in now.');
}

updateProfiles();
