// Environment variables:
//   * HF_TOKEN: Hugging Face API token (read only)

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import type { StatusCode } from 'hono/utils/http-status'

import parseParams from '../lib/parse-params'
import type { Parameters } from '../lib/types'
import secret from '../middleware/secret'

const BASE_URL = 'https://api-inference.huggingface.co'
const DEFAULT_TASK = 'text-generation'
const DEFAULT_MODEL = 'huggingfaceh4/zephyr-7b-beta'

// task presets
const modelByTask = {
  [DEFAULT_TASK]: DEFAULT_MODEL,
  'feature-extraction': 'facebook/bart-base',
  'fill-mask': 'google-bert/bert-base-uncased',
  'question-answering': 'deepset/roberta-base-squad2',
  summarization: 'facebook/bart-large-cnn',
  'text-classification': 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
  'text-to-image': 'stabilityai/stable-diffusion-xl-base-1.0',
  'text-to-speech': 'facebook/mms-tts-eng',
  'token-classification': 'dslim/bert-base-ner',
  translation: 'helsinki-nlp/opus-mt-en-fr',
  'zero-shot-classification': 'typeform/distilbert-base-uncased-mnli'
}

const app = new Hono({ strict: false })

// error handler
app.onError((err, c) => {
  console.error(err)
  if (err instanceof HTTPException) return err.getResponse()
  return c.text(err.message, { status: 500 })
})

// secret key if set
app.use(secret())

// CORS headers
app.use(
  cors({
    origin: '*',
    credentials: true,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'X-Api-Key', // only if using secret middleware
      'X-Use-Cache'
    ]
  })
)

// GET /
app.get('/', (c) => {
  const { HF_TOKEN, SECRET } = c.env
  const url = new URL(c.req.url)
  const params = url.searchParams

  // health check
  if (url.search === '' || (SECRET && url.search === `?api_key=${SECRET}`)) {
    return c.text('OK')
  }

  // defaults
  const parameters = parseParams(
    params,
    {
      // images
      height: [parseInt],
      width: [parseInt],
      guidance_scale: [parseFloat],
      num_inference_steps: [parseInt],
      // multilabel
      multi_label: [(v) => v === 'true'],
      // text generation
      max_length: [parseInt],
      max_time: [parseFloat],
      min_length: [parseInt],
      repetition_penalty: [parseFloat],
      temperature: [parseFloat],
      top_k: [parseInt],
      top_p: [parseFloat]
    },
    // omit these keys
    ['inputs', 'model', 'task', 'use_cache']
  )

  const inputs = params.get('inputs') ?? ''
  const cache = params.get('use_cache') === 'true'
  const task = params.get('task') ?? DEFAULT_TASK
  const model = params.get('model') ?? modelByTask[task] ?? DEFAULT_MODEL

  // fetch
  return huggingFaceFetch({
    cache,
    model,
    token: HF_TOKEN,
    body: { inputs, parameters }
  })
})

// POST /
app.post('/', async (c) => {
  const { HF_TOKEN } = c.env
  let json: Parameters

  // empty request body throws
  try {
    json = await c.req.json()
  } catch (err) {
    throw new HTTPException(400, { message: err.message })
  }

  // defaults
  const {
    context = null,
    question = null,
    task = DEFAULT_TASK,
    use_cache = false,
    ...parameters
  } = json

  const inputs = parameters.inputs
  const model = parameters?.model ?? modelByTask[task as string] ?? DEFAULT_MODEL
  const cache = use_cache as boolean

  // cleanup
  for (const key of ['inputs', 'model']) {
    Reflect.deleteProperty(parameters, key)
  }

  // fetch
  return huggingFaceFetch({
    cache,
    model,
    token: HF_TOKEN,
    body: { inputs, parameters }
  })
})

// POST /chat/completions
app.post('/chat/completions', async (c) => {
  const { HF_TOKEN } = c.env
  let parameters: Parameters

  // empty request body throws
  try {
    parameters = await c.req.json()
  } catch (err) {
    throw new HTTPException(400, { message: err.message })
  }

  // set default model
  const model = (parameters.model ?? DEFAULT_MODEL) as string
  Reflect.deleteProperty(parameters, 'model')

  // fetch
  return huggingFaceFetch({
    model,
    chat: true, // use chat endpoint
    stream: parameters.stream as boolean,
    token: HF_TOKEN,
    body: { model, ...parameters }
  })
})

// proxy
app.all('*', async (c) => {
  const { HF_TOKEN } = c.env

  const host = c.req.header('Host')
  const authorization = c.req.header('Authorization')
  const useCache = c.req.header('X-Use-Cache')

  // replace the host to match the origin and ensure https
  const newHost = BASE_URL.slice(8)
  const { href } = new URL(c.req.url)
  let url = href.replace(host, newHost)
  url = url.replace('http://', 'https://')

  // incoming requests are immutable
  const r = new Request(url, c.req.raw)
  r.headers.set('Host', newHost)
  r.headers.set('X-Use-Cache', useCache ?? 'false')
  r.headers.set('X-Wait-For-Model', 'true')

  if (HF_TOKEN) r.headers.set('Authorization', `Bearer ${HF_TOKEN}`)
  if (authorization) r.headers.set('Authorization', authorization) // honor the original token

  // fetch
  const res = await fetch(r)
  if (!res.ok) {
    const message = await res.text()
    throw new HTTPException(res.status as StatusCode, { message })
  }
  return new Response(res.body, res) // the response returned by fetch is immutable
})

export default app

// client
async function huggingFaceFetch({
  body = {},
  cache = false,
  chat = false,
  model = DEFAULT_MODEL,
  stream = false,
  token
}) {
  const url = chat
    ? `${BASE_URL}/models/${model}/v1/chat/completions`
    : `${BASE_URL}/models/${model}`
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      Accept: stream ? 'text/event-stream' : undefined,
      Authorization: token ? `Bearer ${token}` : undefined,
      'Content-Type': 'application/json',
      'X-Wait-For-Model': 'true',
      'X-Use-Cache': cache ? 'true' : 'false'
    }
  })
  if (!res.ok) {
    const message = await res.text()
    throw new HTTPException(res.status as StatusCode, { message })
  }
  return new Response(res.body, res) // the response returned by fetch is immutable
}
