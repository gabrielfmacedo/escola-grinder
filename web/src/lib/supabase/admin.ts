import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Usar apenas em API Routes / Server Actions — NUNCA no client
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
