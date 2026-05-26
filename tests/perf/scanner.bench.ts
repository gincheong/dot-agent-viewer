import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, bench, beforeAll, describe } from 'vitest'

import { runScan } from '../../src/main/scanner'
import type { UserConfig } from '../../src/shared/types'

let tmp: string
let config: UserConfig
let originalsRoot: string

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dot-agent-bench-'))
  originalsRoot = path.join(tmp, '.agents')
  const claudeRoot = path.join(tmp, '.claude')

  // 500 hub commands + a Claude root with 500 symlinks back.
  const commandsDir = path.join(originalsRoot, 'commands')
  const linkDir = path.join(claudeRoot, 'commands')
  await fs.mkdir(commandsDir, { recursive: true })
  await fs.mkdir(linkDir, { recursive: true })

  for (let i = 0; i < 500; i++) {
    const name = `cmd-${i.toString().padStart(4, '0')}.md`
    const abs = path.join(commandsDir, name)
    await fs.writeFile(
      abs,
      ['---', `description: bench item ${i}`, '---', '# body'].join('\n'),
      'utf8'
    )
    await fs.symlink(abs, path.join(linkDir, name))
  }

  config = {
    originalsRoot,
    roots: [
      {
        name: 'Claude',
        path: claudeRoot,
        scopes: [{ glob: 'commands/**/*.md', kind: 'command' }],
      },
    ],
    mergeStrategy: 'append',
  }
})

afterAll(async () => {
  if (tmp) await fs.rm(tmp, { recursive: true, force: true })
})

describe('runScan @ 500 sources', () => {
  bench(
    'cold scan under 200ms (informational)',
    async () => {
      const r = await runScan({
        config,
        originalsRootResolved: originalsRoot,
      })
      // Light sanity guard — keeps the bench honest if the fixture changes.
      if (r.sources.length !== 500) {
        throw new Error(`expected 500 sources, got ${r.sources.length}`)
      }
    },
    { iterations: 5, warmupIterations: 1 }
  )
})
