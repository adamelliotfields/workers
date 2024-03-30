import type { Handler } from 'hono'

export interface ProxyConfig {
  /** The host to proxy requests to. */
  host: string
  /** Optional additional headers to include in the proxied request. */
  headers?: Record<string, string>
}

export default function handleProxy(config: ProxyConfig): Handler {
  return async (c) => {
    const { host, headers = {} } = config

    // get the request host and proxy host
    const oldHost = c.req.header('Host')
    const newHost = host.startsWith('https://')
      ? host.slice(8)
      : host.startsWith('http://')
        ? host.slice(7)
        : host

    // drop the host parameter and ensure HTTPS
    const url = new URL(c.req.url)
    url.searchParams.delete('host')
    url.protocol = 'https:'

    // swap the host domain
    let { href } = url
    href = href.replace(oldHost, newHost)

    // create a mutable request and set the new host header
    const req = new Request(href, c.req.raw)
    req.headers.set('Host', newHost)

    // add any additional headers
    for (const [key, value] of Object.entries(headers)) {
      req.headers.set(key, value)
    }

    // proxy the request and return a mutable response
    const res = await fetch(req)
    return new Response(res.body, res)
  }
}
