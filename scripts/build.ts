import { resolve } from 'node:path'
import { $ } from 'bun'

const workers = ['huggingface', 'perplexity']

// ensure each worker builds
for (const worker of workers) {
  const workerPath = resolve(__dirname, `../${worker}/worker.ts`)
  await $`bunx wrangler deploy --dry-run ${workerPath}`
}
