# Workers

Cloudflare workers ⚡

## Installation

[Bun](https://bun.sh) is used for dependencies and tests; [Wrangler](https://developers.cloudflare.com/workers/wrangler) is for development and deployment.

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

Each worker depends on a `.dev.vars` in its directory. These set secrets on the `env` object during development. For example, the `huggingface` worker would require this in `huggingface/.dev.vars`:

```
HF_TOKEN=hf_...
```

Each worker gets its own `start` and `deploy` script:

```sh
# run the huggingface worker locally
bun start:hf

# deploy the huggingface worker to hf.you.workers.dev
bun deploy:hf
```

### Authentication

If `SECRET` is set in the worker's environment, then the worker looks for either a `X-Api-Key` header or `?api_key` query parameter that matches the secret.

If `SECRET` is not set, then the worker is public.

## Workers

### [`huggingface`](./src/huggingface/worker.ts)

Wrapper around the 🤗 [Inference API](https://huggingface.co/inference-api/serverless).

### [`perplexity`](./src/perplexity/worker.ts)

Wrapper around the [Perplexity.ai API](https://docs.perplexity.ai).
