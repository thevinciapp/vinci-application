import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { headers } from "next/headers";

import { CookieOptions } from '@supabase/ssr';

export const createClient = async () => {
  const cookieStore = await cookies();
  const headersList = await headers();
  
  // Check for bearer token in Authorization header
  let authHeader: string | null = null;
  try {
    authHeader = headersList.get('authorization');
  } catch (error) {
    console.error('Error accessing authorization header:', error);
  }
  
  const hasAuthHeader = authHeader && authHeader.startsWith('Bearer ');
  
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // For desktop app, prioritize auth header over cookies
          if (name === 'sb-access-token' && hasAuthHeader) {
            return authHeader?.split(' ')[1];
          }
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // For desktop app, we don't need to set cookies as we use auth header
            if (!hasAuthHeader) {
              cookieStore.set(name, value, options);
            }
          } catch (error) {
            // Ignore cookie setting errors in desktop app
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // For desktop app, we don't need to remove cookies as we use auth header
            if (!hasAuthHeader) {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            }
          } catch (error) {
            // Ignore cookie removal errors in desktop app
          }
        }
      },
      // Add auth header from request when available (for Electron)
      global: {
        headers: hasAuthHeader && authHeader ? { Authorization: authHeader } : undefined
      },
      // Increase auth persistence for desktop app
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    },
  );
  
  return client;
};
