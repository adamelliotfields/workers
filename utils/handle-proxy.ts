import type { Handler } from 'hono'

export interface ProxyConfig {
  /** The host to proxy requests to. */
  host: string
  /** Optional list of headers in `key=value` or `-key` format. */
  headers?: string[]
}

export default function handleProxy(config: ProxyConfig): Handler {
  return async (c) => {
    const { host, headers = [] } = config

    // add headers to the request or remove headers from the response
    const addHeaders: Record<string, string> = {}
    const removeHeaders: string[] = []

    for (const header of headers) {
      if (header.startsWith('-')) {
        removeHeaders.push(header.slice(1))
        continue
      }

      if (!header.includes('=')) {
        continue
      }

      const [key, value] = header.split('=')
      addHeaders[key] = value
    }

    // get the request host and proxy host
    const oldHost = c.req.header('Host')
    const newHost = host.startsWith('https://')
      ? host.slice(8)
      : host.startsWith('http://')
        ? host.slice(7)
        : host

    // drop the search parameters and ensure HTTPS
    const url = new URL(c.req.url)
    url.searchParams.delete('headers')
    url.searchParams.delete('host')
    url.protocol = 'https:'

    // swap the host domain
    let { href } = url
    href = href.replace(oldHost, newHost)

    // create a mutable request and set headers
    const req = new Request(href, c.req.raw)
    req.headers.set('Host', newHost)

    for (const [key, value] of Object.entries(addHeaders)) {
      req.headers.set(key, value)
    }

    // proxy the request and create a mutable response
    let res = await fetch(req)
    res = new Response(res.body, res)

    // remove any unwanted headers and return
    for (const header of removeHeaders) {
      res.headers.delete(header)
    }
    return res
  }
}
