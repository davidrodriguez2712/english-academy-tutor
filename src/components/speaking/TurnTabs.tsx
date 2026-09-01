'use client'
import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'

export function TurnTabs({
  said,
  natural,
  aiReply,
}: {
  said: string
  natural: string
  aiReply?: string | null
}) {
  const tabs = [
    { id: 'said', label: 'Lo que dijiste' },
    { id: 'natural', label: 'Versión natural' },
    ...(aiReply ? [{ id: 'ai', label: 'Respuesta de la IA' }] : []),
  ]
  const [active, setActive] = useState('said')
  return (
    <div>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      <p className="p-3 text-sm">
        {active === 'said' && said}
        {active === 'natural' && natural}
        {active === 'ai' && aiReply}
      </p>
    </div>
  )
}
