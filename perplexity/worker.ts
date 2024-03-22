// Environment variables:
//   * PPLX_API_KEY: Your Perplexity API key
//   * ORIGIN: The origin to allow in CORS headers

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import axios from 'redaxios'

import handleError from '../lib/handle-error'
import handleProxy from '../lib/handle-proxy'
import parseParams from '../lib/parse-params'
import type { Env, Parameters } from '../lib/types'

import cors from '../middleware/cors'
import secret from '../middleware/secret'

const BASE_URL = 'https://api.perplexity.ai'
const DEFAULT_MODEL = 'mistral-7b-instruct'

const client = axios.create({
  baseURL: BASE_URL,
  responseType: 'stream', // stream is actually just the raw response body
  headers: {
    'Content-Type': 'application/json'
  }
})

const app = new Hono({ strict: false })

// error handler
app.onError(handleError)

// secret key if set
app.use(secret())

// CORS headers
app.use(cors())

// GET /
// curl http://localhost:8787?prompt=What+is+the+meaning+of+life&model=sonar-medium-chat
app.get('/', async (c) => {
  const { PPLX_API_KEY, SECRET } = c.env as Env
  const url = new URL(c.req.url)
  const params = url.searchParams

  // health check
  if (url.search === '' || (SECRET && url.search === `?api_key=${SECRET}`)) {
    return c.text('OK')
  }

  // params
  const body = parseParams(params, {
    model: [String, DEFAULT_MODEL],
    prompt: [String, ''],
    system: [String, 'Be precise and concise.'],
    max_tokens: [parseInt],
    temperature: [parseFloat],
    top_p: [parseFloat],
    top_k: [parseInt],
    stream: [(v) => v === 'true'],
    presence_penalty: [parseFloat],
    frequency_penalty: [parseFloat]
  })

  body.messages = [
    { role: 'system', content: body.system },
    { role: 'user', content: body.prompt }
  ]

  Reflect.deleteProperty(body, 'prompt')
  Reflect.deleteProperty(body, 'system')

  // fetch
  const res = await client.post('/chat/completions', body, {
    headers: {
      Accept: body.stream ? 'text/event-stream' : undefined,
      Authorization: PPLX_API_KEY ? `Bearer ${PPLX_API_KEY}` : undefined
    }
  })
  return new Response(res.data, res)
})

// POST /
// curl http://localhost:8787 -X POST -d '{ "messages": [{ "role": "system", "content": "Be awesome." }, { "role": "user", "content": "How are you?" }] }'
app.post('/', async (c) => {
  const { PPLX_API_KEY } = c.env as Env

  try {
    // throws if bad
    const body: Parameters = await c.req.json()
    body.model = body.model ?? DEFAULT_MODEL
    const res = await client.post('/chat/completions', body, {
      headers: {
        Accept: body.stream ? 'text/event-stream' : undefined,
        Authorization: PPLX_API_KEY ? `Bearer ${PPLX_API_KEY}` : undefined
      }
    })
    return new Response(res.data, res)
  } catch (err) {
    throw new HTTPException(400, { message: err.message })
  }
})

// POST /chat/completions (proxy)
// curl http://localhost:8787/chat/completions -X POST -H 'Content-Type: application/json' -d '{ "model": "mistral-7b-instruct", "messages": [{ "role": "system", "content": "Be precise." }, { "role": "user", "content": "Explain backpropagation." }] }'
app.post('/chat/completions', handleProxy({ url: BASE_URL, envToken: 'PPLX_API_KEY' }))

export default app
