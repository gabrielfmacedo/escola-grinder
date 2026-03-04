'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import type { UserRole } from '@/lib/supabase/types'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface Props {
  profile: Profile
  role: UserRole
  streak?: number
  children: React.ReactNode
  banner?: React.ReactNode
}

export default function LayoutShell({ profile, role, streak = 0, children, banner }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {/* Backdrop — mobile only */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar role={role} streak={streak} isOpen={sidebarOpen} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          profile={profile}
          streak={streak}
          onMenuClick={() => setSidebarOpen(v => !v)}
        />
        {banner}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
