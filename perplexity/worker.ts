// Environment variables:
//   * PPLX_API_KEY: Your Perplexity API key

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import type { StatusCode } from 'hono/utils/http-status'

import parseParams from '../lib/parse-params'
import type { Parameters } from '../lib/types'
import secret from '../middleware/secret'

const BASE_URL = 'https://api.perplexity.ai'
const DEFAULT_MODEL = 'mistral-7b-instruct'

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
      'X-Api-Key' // only if using secret middleware
    ]
  })
)

// GET /
// curl http://localhost:8787?prompt=What+is+the+meaning+of+life&model=sonar-medium-chat
app.get('/', (c) => {
  const { PPLX_API_KEY, SECRET } = c.env
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
  return perplexityFetch({ body, token: PPLX_API_KEY })
})

// POST /
// curl http://localhost:8787 -X POST -d '{ "messages": [{ "role": "system", "content": "Be awesome." }, { "role": "user", "content": "How are you?" }] }'
app.post('/', async (c) => {
  const { PPLX_API_KEY } = c.env

  try {
    const body: Parameters = await c.req.json()
    return perplexityFetch({ body, token: PPLX_API_KEY })
  } catch (err) {
    throw new HTTPException(400, { message: err.message })
  }
})

// POST /chat/completions (proxy)
// curl http://localhost:8787/chat/completions -X POST -H 'Content-Type: application/json' -d '{ "model": "mistral-7b-instruct", "messages": [{ "role": "system", "content": "Be precise." }, { "role": "user", "content": "Explain backpropagation." }] }'
app.post('/chat/completions', async (c) => {
  const { PPLX_API_KEY } = c.env

  const host = c.req.header('Host')
  const authorization = c.req.header('Authorization')

  // replace the host to match the origin and ensure https
  const newHost = BASE_URL.slice(8)
  const { href } = new URL(c.req.url)
  let url = href.replace(host, newHost)
  url = url.replace('http://', 'https://')

  // incoming requests are immutable
  const r = new Request(url, c.req.raw)
  r.headers.set('Host', newHost)

  // add authorization
  if (PPLX_API_KEY) r.headers.set('Authorization', `Bearer ${PPLX_API_KEY}`)
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
async function perplexityFetch({
  body = {},
  model = DEFAULT_MODEL,
  stream = false,
  token
}) {
  const url = `${BASE_URL}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ model, ...body }),
    headers: {
      Accept: stream ? 'text/event-stream' : undefined,
      Authorization: token ? `Bearer ${token}` : undefined,
      'Content-Type': 'application/json'
    }
  })
  if (!res.ok) {
    const message = await res.text()
    throw new HTTPException(res.status as StatusCode, { message })
  }
  return new Response(res.body, res) // the response returned by fetch is immutable
}
