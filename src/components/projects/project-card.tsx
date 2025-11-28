'use client'

import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Folder, ArrowRight, Server, Key } from 'lucide-react'

interface ProjectCardProps {
  id: string
  name: string
  createdAt: string
  serverCount?: number
  keyCount?: number
}

export function ProjectCard({ id, name, createdAt, serverCount = 0, keyCount = 0 }: ProjectCardProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/dashboard/${id}`)
  }

  return (
    <Card 
      className="border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700 hover:bg-zinc-800/50 cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
              <Folder className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <CardTitle className="text-zinc-50">{name}</CardTitle>
              <CardDescription className="text-zinc-500 text-xs mt-1">
                Created {new Date(createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800"
            onClick={handleClick}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <Server className="h-4 w-4" />
            <span>{serverCount} {serverCount === 1 ? 'Server' : 'Servers'}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Key className="h-4 w-4" />
            <span>{keyCount} {keyCount === 1 ? 'Key' : 'Keys'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
