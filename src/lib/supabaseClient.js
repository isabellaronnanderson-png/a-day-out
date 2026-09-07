import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Set these in a .env file locally and in your Vercel project settings.'
  );
}

// createClient() throws immediately if the URL/key are missing or malformed.
// Since this module is imported before React ever renders, letting that
// throw here would crash the whole app into a blank white screen with no
// on-screen explanation. Fall back to a harmless placeholder client instead
// so App.jsx can detect `supabaseConfigured` and show a real error message.
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');
