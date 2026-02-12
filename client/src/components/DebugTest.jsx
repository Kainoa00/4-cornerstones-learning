import { supabase } from '../supabaseClient';
import { useEffect, useState } from 'react';

export default function DebugTest() {
  const [results, setResults] = useState({});

  useEffect(() => {
    async function runTests() {
      const tests = {};

      // Check env vars are loaded
      tests.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'MISSING';
      tests.supabaseKeyLength = import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0;

      // Check if supabase client exists
      tests.supabaseClientExists = !!supabase;

      // Try a simple API call
      try {
        const { data, error } = await supabase.auth.getSession();
        tests.sessionCheck = error ? `Error: ${error.message}` : 'OK';
      } catch (err) {
        tests.sessionCheck = `Exception: ${err.message}`;
      }

      // Try sign in
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'alice.johnson@school.edu',
          password: 'demo123'
        });
        tests.signInTest = error ? `Error: ${error.message}` : 'SUCCESS!';
      } catch (err) {
        tests.signInTest = `Exception: ${err.message}`;
      }

      setResults(tests);
    }

    runTests();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Test Results</h1>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
}
