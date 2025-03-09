import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { headers } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();
  const headersList = headers();
  
  // Check for bearer token in Authorization header
  const authHeader = headersList.get('Authorization');
  const hasAuthHeader = authHeader && authHeader.startsWith('Bearer ');
  
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      // Add auth header from request when available (for Electron)
      global: {
        headers: hasAuthHeader ? { Authorization: authHeader } : undefined
      }
    },
  );
  
  return client;
};
