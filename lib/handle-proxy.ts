import type { Handler } from 'hono'

export interface ProxyConfig {
  /** The URL to proxy requests to. */
  url: string
  /** Optional additional headers to include in the proxied request. */
  addHeaders?: Record<string, string>
  /** Optional secret environment variable name to use as a token. */
  envToken?: string
  /** Use API key instead of Bearer auth. */
  useApiKey?: boolean
}

export default function handleProxy(config: ProxyConfig): Handler {
  return async (c) => {
    const { url, envToken, addHeaders = {}, useApiKey = false } = config
    const TOKEN = c.env[envToken] as string

    // get the url from the request and swap the host
    const host = c.req.header('Host')
    const newHost = url.slice(8)
    let { href } = new URL(c.req.url)
    href = href.replace(host, newHost)
    href = href.replace('http://', 'https://')

    // create a new mutable request object
    const req = new Request(href, c.req.raw)
    req.headers.set('Host', newHost)

    // add the token to the headers
    if (TOKEN) {
      const key = useApiKey ? 'X-Api-Key' : 'Authorization'
      const value = useApiKey ? TOKEN : `Bearer ${TOKEN}`
      req.headers.set(key, value)
    }

    // add any additional headers
    for (const [key, value] of Object.entries(addHeaders)) {
      req.headers.set(key, value)
    }

    // fetch the proxied request and return a new mutable response
    const res = await fetch(req)
    return new Response(res.body, res)
  }
}
