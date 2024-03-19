// Environment variables:
//   * OPENAI_API_KEY: Your OpenAI API key
//   * PPLX_API_KEY: Your Perplexity API key
// const BASE_URL = 'https://api.openai.com/v1'
// const DEFAULT_MODEL = 'gpt-3.5-turbo'
const BASE_URL = 'https://api.perplexity.ai' // no `v1`
const DEFAULT_MODEL = 'mistral-7b-instruct'

export default {
  fetch: (req, env) => {
    if (req.method === 'OPTIONS') return wrap(OPTIONS)()

    switch (new URL(req.url).pathname) {
      case '/':
      case '/chat/completions':
      case '/chat/completions/':
        if (req.method === 'GET') return wrap(GET)(req, env)
        if (req.method === 'POST') return wrap(POST)(req, env)
        return new Response('Method Not Allowed', { status: 405 })
      default:
        return new Response('Not Found', { status: 404 })
    }
  }
}

async function POST(req, env) {
  const { OPENAI_API_KEY, PPLX_API_KEY } = env
  const token = OPENAI_API_KEY ?? PPLX_API_KEY
  try {
    const body = await req.json()
    const response = await openAIFetch({ body, token })
    return withHeaders(response)
  } catch (err) {
    throw new HttpError(400, err.message, 'Invalid JSON')
  }
}

async function GET(req, env) {
  const { OPENAI_API_KEY, PPLX_API_KEY } = env
  const token = OPENAI_API_KEY ?? PPLX_API_KEY
  const url = new URL(req.url)

  // health check
  if (url.search === '') return withHeaders(new Response('OK', { status: 200 }))

  // params
  const body = parametersFromSearchParams(url.searchParams)
  body.messages = [
    { role: 'system', content: body.system },
    { role: 'user', content: body.prompt }
  ]
  Reflect.deleteProperty(body, 'prompt')
  Reflect.deleteProperty(body, 'system')

  // fetch
  const response = await openAIFetch({ body, token })
  return withHeaders(response)
}

// OPTIONS for CORS
async function OPTIONS() {
  const res = new Response(null, {
    status: 204, // no content
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type'
    }
  })
  return withHeaders(res)
}

// client
async function openAIFetch({
  body = {},
  headers = {},
  model = DEFAULT_MODEL,
  stream = false,
  token
}) {
  const url = `${BASE_URL}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ model, ...body }),
    headers: {
      Accept: stream ? 'text/event-stream' : 'application/json',
      Authorization: token ? `Bearer ${token}` : undefined,
      'Content-Type': 'application/json',
      ...headers
    }
  })
  return withHeaders(res)
}

// set some defaults and cast
function parametersFromSearchParams(searchParams) {
  const parameters = {}
  parameters.model = parse(searchParams, 'model') ?? DEFAULT_MODEL
  parameters.prompt = parse(searchParams, 'prompt') ?? ''
  parameters.system = parse(searchParams, 'system') ?? 'Be precise and concise.'
  parameters.max_tokens = parse(searchParams, 'max_tokens', Number.parseInt)
  parameters.temperature = parse(searchParams, 'temperature', Number.parseFloat)
  parameters.top_p = parse(searchParams, 'top_p', Number.parseFloat)
  parameters.top_k = parse(searchParams, 'top_k', Number.parseInt)
  parameters.stream = parse(searchParams, 'stream', (v) => v === 'true')
  parameters.presence_penalty = parse(
    searchParams,
    'presence_penalty',
    Number.parseFloat
  )
  parameters.frequency_penalty = parse(
    searchParams,
    'frequency_penalty',
    Number.parseFloat
  )
  return parameters
}

// parse search params
function parse(searchParams, param, parser = String) {
  const value = searchParams.get(param)
  return value ? parser(value) : undefined
}

// common headers
function withHeaders(res) {
  const r = new Response(res.body, res)
  const vary = r.headers.get('Vary')
  r.headers.set('Vary', vary ? `Origin, ${vary}` : 'Origin')
  r.headers.set('Access-Control-Allow-Origin', '*')
  return r
}

// wrap handler to catch errors
function wrap(handler) {
  return async (req, env) => {
    try {
      return await handler(req, env)
    } catch (err) {
      return handleError(err)
    }
  }
}

/** @param {HttpError} error */
function handleError(error) {
  console.error(error)
  const status = error.statusCode ?? 500
  const body = error.error ?? 'Internal Server Error'
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
  })
}

class HttpError extends Error {
  constructor(statusCode, error, message) {
    super(message)
    this.statusCode = statusCode
    this.error = error
    this.name = 'HttpError'
    Error.captureStackTrace(this, this.constructor)
  }
}
