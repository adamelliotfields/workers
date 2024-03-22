import { resolve } from 'node:path'
import { $ } from 'bun'

const workers = ['huggingface', 'perplexity']

// ensure each worker builds
for (let i = 0; i < workers.length; i++) {
  console.log(`${i > 0 ? '\n ' : ' '}🏗️  Building ${workers[i]} worker...`)
  const workerPath = resolve(__dirname, `../${workers[i]}/worker.ts`)
  await $`bunx wrangler deploy --dry-run ${workerPath}`
}
