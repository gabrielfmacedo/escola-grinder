import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MentoriaPlayer from '@/components/mentoria/MentoriaPlayer'

export default async function MentoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto">
      <MentoriaPlayer />
    </div>
  )
}
