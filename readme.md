# Workers

Cloudflare workers ⚡

## Installation

[Bun](https://bun.sh) is used for deps, tests, and scripts; [Wrangler](https://developers.cloudflare.com/workers/wrangler) for development and deployment.

```sh
# install bun
export PATH="${HOME}/.bun/bin:${PATH}"
curl -fsSL https://bun.sh/install | bash

# install dependencies
bun i

# configure environment (only if you want to deploy)
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
```

## Usage

### Environment variables

Create a `.dev.vars` file in the worker's folder. These set secrets on the `env` object during development. For example, the `huggingface` worker would require this in `huggingface/.dev.vars`:

```
HF_TOKEN=hf_...
```

See [`types.ts`](./lib/types.ts) for more. Use `wrangler secret {list,put,delete} --name=...` to manage secrets for a deployed worker.

### Scripts

Each worker gets its own `start` and `deploy` script:

```sh
# run the huggingface worker locally
bun start:hf

# deploy the huggingface worker to hf.you.workers.dev
bun deploy:hf
```

## Workers

### [`huggingface`](./huggingface/worker.ts)

Wrapper around the 🤗 [Inference API](https://huggingface.co/inference-api/serverless).

#### `GET /`

Supports query params with task presets and default models for convenience.

```sh
curl \
  -G \
  -d 'model=google/flan-t5-base&inputs=Translate+to+French:+I+love+Hugging+Face!' \
  https://localhost:8787

curl \
  -G \
  -d 'task=text-to-image&inputs=watercolor+painting+marina+sunset&negative_prompt=birds' \
  https://localhost:8787
```

#### `POST /`

Same as above but with JSON

```sh
curl \
  -d '{ "task": "text-to-speech", "inputs": "I love Hugging Face!" }' \
  -o speech.flac \
  https://localhost:8787
```

#### `POST /chat/completions`

OpenAI-compatible chat format. Model defaults to [`huggingfaceh4/zephyr-7b-beta`](https://huggingface.co/HuggingFaceH4/zephyr-7b-beta). See [TGI Messages API](https://huggingface.co/blog/tgi-messages-api).

```sh
curl \
  -d '{ "messages": [{ "role": "system", "content": "Be precise and concise." }, { "role": "user", "content": "How many stars are in our galaxy?" }] }' \
  https://localhost:8787/chat/completions
```

```ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: '', // pass empty string
  baseURL: 'http://localhost:8787/chat/completions'
})

const stream = await openai.chat.completions.create({
  stream: true,
  model: 'huggingfaceh4/zephyr-7b-beta',
  messages: [
    { role: 'system', content: 'Be precise and concise.' },
    { role: 'user', content: 'How many stars are in our galaxy?' }
  ]
})

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '')
}
```

### [`perplexity`](./perplexity/worker.ts)

Wrapper around the [Perplexity.ai API](https://docs.perplexity.ai).

#### `GET /`

Supports query params for convenience. Model defaults to `llama-3-sonar-small-32k-chat` and system prompt defaults to `Be precise and concise.`.

```sh
curl \
  -G \
  -d 'prompt=How+many+stars+are+in+our+galaxy?' \
  https://localhost:8787
```

#### `POST /`

OpenAI-compatible chat format.

```sh
curl \
  -d '{ "messages": [{ "role": "system", "content": "Be precise and concise." }, { "role": "user", "content": "How many stars are in our galaxy?" }] }' \
  https://localhost:8787
```

```ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: '', // pass empty string
  baseURL: 'http://localhost:8787/chat/completions'
})

const stream = await openai.chat.completions.create({
  stream: true,
  model: 'llama-3-sonar-large-32k-chat',
  messages: [
    { role: 'system', content: 'Be precise and concise.' },
    { role: 'user', content: 'How many stars are in our galaxy?' }
  ]
})

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '')
}
```

### [`proxy`](./proxy/worker.ts)

Simple proxy for any URL. Sets CORS headers on the response. Accepts optional headers that can be added to the request or removed from the response.

```sh
curl http://localhost:8787/user/1?host=api.github.com

# with auth
curl "http://localhost:8787/user/1?host=api.github.com&headers=authorization=Bearer%20${GH_TOKEN}"

# with response headers removed
curl http://localhost:8787/user/1?host=api.github.com&headers=-x-frame-options,-content-security-policy
```
