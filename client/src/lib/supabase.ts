import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== "" && supabaseAnonKey !== "";
};

// Only create the client if configuration exists
// Otherwise provide a dummy that won't be used (demo mode)
let _supabase: SupabaseClient;

if (isSupabaseConfigured()) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Create a minimal proxy that won't throw
  _supabase = new Proxy({} as SupabaseClient, {
    get: (_target, prop) => {
      if (prop === "auth") {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithPassword: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
          signOut: () => Promise.resolve({ error: null }),
        };
      }
      if (prop === "from") {
        return () => ({
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }), order: () => Promise.resolve({ data: [], error: null }) }), or: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }), order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }) }) }),
          update: () => ({ eq: () => Promise.resolve({ error: { message: "Supabase not configured" } }) }),
          delete: () => ({ eq: () => Promise.resolve({ error: { message: "Supabase not configured" } }) }),
        });
      }
      if (prop === "rpc") {
        return () => Promise.resolve({ data: null, error: null });
      }
      return () => {};
    },
  });
  console.info("[Motion解説] Supabase未設定のため、デモモードで動作しています。");
}

export const supabase = _supabase;
