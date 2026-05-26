import type { AgentRoot } from '../../shared/types'

type Props = {
  agentRoot: AgentRoot
}

/**
 * Colored pill rendering the agent root name. Claude → blue, Gemini → green,
 * everything else → neutral grey.
 */
export function AgentBadge({ agentRoot }: Props): JSX.Element {
  const tone = toneFor(agentRoot.name)
  return (
    <span className="agent-badge" data-agent={tone} title={agentRoot.path}>
      {agentRoot.name}
    </span>
  )
}

function toneFor(name: string): string {
  const lower = name.toLowerCase()
  if (lower === 'claude') return 'claude'
  if (lower === 'gemini') return 'gemini'
  return 'neutral'
}
