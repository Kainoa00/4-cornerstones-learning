import { useState } from 'react';

export default function DirectApiTest() {
  const [result, setResult] = useState('');

  const testDirectApi = async () => {
    try {
      const response = await fetch('https://klbqrnwsmrxuzmficesc.supabase.co/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYnFybndzbXJ4dXptZmljZXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzQ5NjksImV4cCI6MjA4NjQxMDk2OX0.D7bxRnW5DgHfRJ7kyq6obhkTDr0H4F7-NYM7tW0TJgg',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'alice.johnson@school.edu',
          password: 'demo123'
        })
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Direct API Test</h1>
      <button onClick={testDirectApi} style={{ padding: '10px 20px', marginBottom: '20px' }}>
        Test Direct Login API
      </button>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
        {result || 'Click button to test'}
      </pre>
    </div>
  );
}
