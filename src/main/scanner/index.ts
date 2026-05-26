// Scanner orchestrator. See plan §4 Phase 4.

import type {
  AgentRoot,
  ScanResult,
  ScanWarning,
  SourceItem,
  UserConfig,
} from '../../shared/types'
import { scanAgentRoots } from './agent-roots'
import { buildOriginalsIndex } from './sources'

const PROVENANCE_ORDER: Record<SourceItem['provenance'], number> = {
  'agents-hub': 0,
  'agent-local': 1,
  'external-link': 2,
}

const KIND_ORDER: Record<SourceItem['kind'], number> = {
  command: 0,
  skill: 1,
}

function sortSources(items: SourceItem[]): SourceItem[] {
  return items.sort((a, b) => {
    const pa = PROVENANCE_ORDER[a.provenance] - PROVENANCE_ORDER[b.provenance]
    if (pa !== 0) return pa
    const ka = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    if (ka !== 0) return ka
    return a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase())
  })
}

export type RunScanOptions = {
  /** Optional override for `originalsRoot` (used by tests). */
  originalsRoot?: string | null
}

export type RunScanInput = {
  config: UserConfig
  /** Whether `config.originalsRoot` exists on disk. */
  originalsRootResolved: string | null
  /** Warnings collected during config load. */
  configWarnings?: ScanWarning[]
}

/**
 * Run a single scan pass.
 *
 * `originalsRootResolved` is the actually-usable absolute hub path (or null
 * if hub-grouping is disabled, either by user config or because the configured
 * path is missing on disk).
 */
export async function runScan(input: RunScanInput): Promise<ScanResult> {
  const { config, originalsRootResolved } = input
  const warnings: ScanWarning[] = [...(input.configWarnings ?? [])]

  const originalsIndex = await buildOriginalsIndex(originalsRootResolved)
  warnings.push(...originalsIndex.warnings)

  const rootsResult = await scanAgentRoots(config.roots, originalsRootResolved, originalsIndex)
  warnings.push(...rootsResult.warnings)

  // Sort symlink refs on each hub item (stable, deterministic UI).
  for (const item of originalsIndex.items) {
    item.symlinks.sort((a, b) => {
      const an = a.agentRoot.name.localeCompare(b.agentRoot.name)
      if (an !== 0) return an
      return a.linkPath.localeCompare(b.linkPath)
    })
  }

  const sources = sortSources([...originalsIndex.items, ...rootsResult.externalAndLocalItems])
  const agents: AgentRoot[] = config.roots.map((r) => ({ name: r.name, path: r.path }))

  return {
    sources,
    agents,
    originalsRoot: originalsRootResolved ?? '',
    scannedAt: Date.now(),
    warnings,
  }
}
