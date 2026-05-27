import type { AgentRoot } from '../../shared/types'

type Props = {
  agentRoot: AgentRoot
}

/**
 * Colored pill rendering the agent root name. Claude → blue, Gemini → green,
 * Cursor → purple, Codex → amber, everything else → neutral grey.
 */
export function AgentBadge({ agentRoot }: Props): JSX.Element {
  const tone = toneFor(agentRoot.name)
  return (
    <span className="agent-badge" data-agent={tone} title={agentRoot.path}>
      {agentRoot.name}
    </span>
  )
}

const KNOWN_TONES = new Set(['claude', 'gemini', 'cursor', 'codex'])

function toneFor(name: string): string {
  const lower = name.toLowerCase()
  return KNOWN_TONES.has(lower) ? lower : 'neutral'
}
