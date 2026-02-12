// Custom auth functions that bypass the Supabase JS library bug
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const customSignIn = async (email, password) => {
  console.log('customSignIn called with:', { email, passwordLength: password?.length });
  console.log('SUPABASE_URL:', SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY length:', SUPABASE_ANON_KEY?.length);

  try {
    const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    console.log('Fetching URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    console.log('Response received:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('Login failed:', data);
      return { data: null, error: { message: data.msg || data.error_description || 'Login failed' } };
    }

    // Store session in localStorage (mimicking Supabase behavior)
    localStorage.setItem('supabase.auth.token', JSON.stringify(data));

    return { data, error: null };
  } catch (error) {
    console.error('customSignIn exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const customSignUp = async (email, password, metadata = {}) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        data: metadata
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: { message: data.msg || data.error_description || 'Signup failed' } };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message } };
  }
};

export const customSignOut = async () => {
  localStorage.removeItem('supabase.auth.token');
  return { error: null };
};
