// Environment variables:
//   * HF_TOKEN: Hugging Face API token (read only)
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

export default {
  fetch: (req, env) => {
    if (req.method === 'OPTIONS') return wrap(OPTIONS)()

    switch (new URL(req.url).pathname) {
      case '/':
        if (req.method === 'GET') return wrap(GET)(req, env)
        if (req.method === 'POST') return wrap(POST)(req, env)
        return new Response('Method Not Allowed', { status: 405 })
      case '/chat/completions':
      case '/chat/completions/':
        if (req.method === 'POST') return wrap(handleChatCompletions)(req, env)
        return new Response('Method Not Allowed', { status: 405 })
      default:
        return wrap(handleProxy)(req, env)
    }
  }
}

// GET uses query params for convenience
async function GET(req, env) {
  // https://developers.cloudflare.com/workers/configuration/environment-variables
  const { HF_TOKEN } = env // NOTE: use your read_only token
  const url = new URL(req.url)
  const params = url.searchParams

  // health check
  if (url.search === '') return withHeaders(new Response('OK', { status: 200 }))

  // defaults
  const parameters = parametersFromSearchParams(params)
  const task = parse(params, 'task') ?? DEFAULT_TASK
  const cache = parse(params, 'use_cache', (v) => v === 'true') ?? false

  // inputs
  let inputs = parse(params, 'inputs')
  const context = parse(params, 'context')
  const question = parse(params, 'question')
  if (context && question) {
    inputs = { context, question }
  }

  // model
  const model = parse(params, 'model') ?? modelByTask[task] ?? DEFAULT_MODEL

  // fetch
  return huggingFaceFetch({
    cache,
    model,
    token: HF_TOKEN,
    body: { inputs, parameters }
  })
}

// POST uses the request body instead of query params
async function POST(req, env) {
  const { HF_TOKEN } = env
  let json

  // empty request body throws
  try {
    json = await req.json()
  } catch (err) {
    throw new HttpError(400, 'Bad Request', err.message)
  }

  // defaults
  const {
    context = null,
    question = null,
    task = DEFAULT_TASK,
    use_cache: cache = false,
    ...parameters
  } = json

  // inputs
  let inputs = parameters.inputs
  if (context && question) {
    inputs = { context, question }
  }

  // model
  const model = parameters?.model ?? modelByTask[task] ?? DEFAULT_MODEL

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
}

// OPTIONS for CORS
async function OPTIONS() {
  const res = new Response(null, {
    status: 204, // no content
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': [
        'Accept',
        'Authorization',
        'Content-Type',
        'X-Use-Cache',
        'X-Wait-For-Model'
      ].join(', ')
    }
  })
  return withHeaders(res)
}

// chat completions
async function handleChatCompletions(req, env) {
  const { HF_TOKEN } = env
  let parameters

  // empty request body throws
  try {
    parameters = await req.json()
  } catch (err) {
    throw new HttpError(400, 'Bad Request', err.message)
  }

  // set default model
  // NOTE: client SDKs like openai will still require a model being set
  const model = parameters.model ?? DEFAULT_MODEL
  Reflect.deleteProperty(parameters, 'model')

  // fetch
  return huggingFaceFetch({
    model,
    chat: true,
    stream: parameters.stream,
    token: HF_TOKEN,
    body: { model, ...parameters }
  })
}

// proxy
async function handleProxy(req, env) {
  const { HF_TOKEN } = env

  // replace the host to match the origin
  const host = req.headers.get('Host')
  const authorization = req.headers.get('Authorization')
  const useCache = req.headers.get('X-Use-Cache')
  const newHost = BASE_URL.slice(8)
  const { href } = new URL(req.url)
  const url = href.replace(host, newHost)

  // incoming requests are immutable
  const r = new Request(url, req)
  r.headers.set('Host', newHost)
  r.headers.set('X-Use-Cache', useCache ?? 'false')
  r.headers.set('X-Wait-For-Model', 'true')
  r.headers.set(
    'Authorization',
    authorization ?? HF_TOKEN ? `Bearer ${HF_TOKEN}` : undefined
  )

  // fetch
  const res = await fetch(r)
  if (!res.ok) {
    const text = await res.text()
    throw new HttpError(res.status, res.statusText, text)
  }
  return withHeaders(res)
}

// client
async function huggingFaceFetch({
  body = {},
  cache = false,
  chat = false,
  headers = {},
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
      'X-Use-Cache': cache ? 'true' : 'false',
      ...headers
    }
  })
  return withHeaders(res)
}

// common headers
function withHeaders(res) {
  const r = new Response(res.body, res)
  const vary = r.headers.get('Vary')
  r.headers.set('Vary', vary ? `Origin, ${vary}` : 'Origin')
  r.headers.set('Access-Control-Allow-Origin', '*')
  return r
}

// build parameters object from URLSearchParams for GET requests
function parametersFromSearchParams(searchParams) {
  const parameters = {}

  // images
  parameters.height = parse(searchParams, 'height', Number.parseInt)
  parameters.width = parse(searchParams, 'width', Number.parseInt)
  parameters.guidance_scale = parse(searchParams, 'guidance_scale', Number.parseFloat)
  parameters.num_inference_steps = parse(
    searchParams,
    'num_inference_steps',
    Number.parseInt
  )

  // candidate labels
  const candidateLabels = parse(searchParams, 'candidate_labels', (v) => v.split(','))
  if (candidateLabels) {
    parameters.candidate_labels = candidateLabels
  }

  // multilabel
  parameters.multi_label = parse(searchParams, 'multi_label', (v) => v === 'true')

  // summarization
  parameters.max_length = parse(searchParams, 'max_length', Number.parseInt)
  parameters.max_time = parse(searchParams, 'max_time', Number.parseFloat)
  parameters.min_length = parse(searchParams, 'min_length', Number.parseInt)
  parameters.repetition_penalty = parse(
    searchParams,
    'repetition_penalty',
    Number.parseFloat
  )
  parameters.temperature = parse(searchParams, 'temperature', Number.parseFloat)
  parameters.top_k = parse(searchParams, 'top_k', Number.parseInt)
  parameters.top_p = parse(searchParams, 'top_p', Number.parseFloat)

  // cleanup
  for (const key of ['context', 'inputs', 'model', 'question', 'task', 'use_cache']) {
    Reflect.deleteProperty(parameters, key)
  }

  return parameters
}

// parse search params
function parse(searchParams, param, parser = String) {
  const value = searchParams.get(param)
  return value ? parser(value) : undefined
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
