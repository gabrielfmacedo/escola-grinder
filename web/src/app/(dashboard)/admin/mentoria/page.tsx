import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatConfigAdmin from '@/components/admin/StatConfigAdmin'

export default async function AdminMentoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'instructor'].includes(profile.role)) redirect('/dashboard')

  return (
    <div className="max-w-3xl mx-auto">
      <StatConfigAdmin />
    </div>
  )
}
