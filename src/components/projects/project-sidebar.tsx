'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Server, Key, Settings, ArrowLeft } from 'lucide-react'

interface ProjectSidebarProps {
  projectId: string
  projectName: string
}

export function ProjectSidebar({ projectId, projectName }: ProjectSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Overview',
      href: `/dashboard/${projectId}`,
      icon: Home,
    },
    {
      label: 'Connections',
      href: `/dashboard/${projectId}/connections`,
      icon: Server,
    },
    {
      label: 'API Keys',
      href: `/dashboard/${projectId}/keys`,
      icon: Key,
    },
    {
      label: 'Settings',
      href: `/dashboard/${projectId}/settings`,
      icon: Settings,
    },
  ]

  return (
    <div className="w-64 border-r border-zinc-800 bg-zinc-950 h-screen sticky top-0">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <h2 className="text-lg font-semibold text-zinc-50 truncate">
            {projectName}
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-zinc-800 text-zinc-50'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
