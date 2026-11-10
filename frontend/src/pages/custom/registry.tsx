import type { ComponentType } from 'react'
import type { Task } from '@/api/types'
import { EmptyState } from '@/components/ui'
import { CatStatsPage } from './CatStatsPage'

export type CustomPageComponent = ComponentType<{ task: Task }>

const REGISTRY: Record<string, CustomPageComponent> = {
  stats: CatStatsPage,
}

export function CustomTaskPage({ task, kind }: { task: Task; kind: string }) {
  const Component = REGISTRY[kind]
  if (!Component) {
    return (
      <EmptyState title="Unknown custom page">
        No frontend component is registered for kind <code className="mono">{kind}</code>.
      </EmptyState>
    )
  }
  return <Component task={task} />
}
