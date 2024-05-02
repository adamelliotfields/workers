// Environment variables:
//   * HF_TOKEN: Your Hugging Face API token (read only) (required)
//   * ORIGIN: The origin to allow in CORS headers

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import axios from 'redaxios'

import handleError from '../utils/handle-error'
import handleProxy from '../utils/handle-proxy'
import parseParams from '../utils/parse-params'
import type { Env, Parameters } from '../utils/types'

import cors from '../middleware/cors'
import env from '../middleware/env'
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

const client = axios.create({
  baseURL: BASE_URL,
  responseType: 'stream', // stream is actually just the raw response body
  headers: {
    'Content-Type': 'application/json',
    'X-Wait-For-Model': 'true'
  }
})

const app = new Hono({ strict: false })

// error handler
app.onError(handleError)

// middleware
app.use(env(['HF_TOKEN']))
app.use(secret())
app.use(cors())

// GET /
app.get('/', async (c) => {
  const { HF_TOKEN, SECRET } = c.env as Env
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

  const headers = {
    Authorization: HF_TOKEN ? `Bearer ${HF_TOKEN}` : undefined,
    'X-Use-Cache': cache ? 'true' : 'false'
  }
  const res = await client.post(`/models/${model}`, { inputs, parameters }, { headers })
  return new Response(res.data, res)
})

// POST /
app.post('/', async (c) => {
  const { HF_TOKEN } = c.env as Env
  let json: Parameters

  // empty request body throws
  try {
    json = await c.req.json()
  } catch (err) {
    throw new HTTPException(400, { message: err.message })
  }

  // defaults
  const { task = DEFAULT_TASK, use_cache = false, ...parameters } = json

  const inputs = parameters.inputs
  const model = parameters?.model ?? modelByTask[task as string] ?? DEFAULT_MODEL
  const cache = use_cache as boolean

  // cleanup
  for (const key of ['inputs', 'model']) {
    Reflect.deleteProperty(parameters, key)
  }

  // fetch
  const headers = {
    Authorization: HF_TOKEN ? `Bearer ${HF_TOKEN}` : undefined,
    'X-Use-Cache': cache ? 'true' : 'false'
  }
  const res = await client.post(`/models/${model}`, { inputs, parameters }, { headers })
  return new Response(res.data, res)
})

// POST /chat/completions
app.post('/chat/completions', async (c) => {
  const { HF_TOKEN } = c.env as Env
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
  const headers = {
    Accept: parameters.stream ? 'text/event-stream' : undefined,
    Authorization: HF_TOKEN ? `Bearer ${HF_TOKEN}` : undefined,
    'X-Use-Cache': 'false'
  }
  const res = await client.post(
    `/models/${model}/v1/chat/completions`,
    { model, ...parameters },
    { headers }
  )
  return new Response(res.data, res)
})

app.all('*', (c, next) => {
  const { HF_TOKEN } = c.env as Env
  const authorization = HF_TOKEN ? `Bearer ${HF_TOKEN}` : ''
  return handleProxy({
    host: BASE_URL,
    headers: [
      authorization.length && `Authorization=${authorization}`,
      'X-Wait-For-Model=true'
    ].filter(Boolean)
  })(c, next)
})

export default app
