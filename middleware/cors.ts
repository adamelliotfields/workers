import { cors as corsMiddleware } from 'hono/cors'
import type { MiddlewareHandler } from 'hono/types'

import globToRegExp from '../lib/glob-to-regexp'
import type { Env } from '../lib/types'

export interface CorsConfig {
  addMethods?: string[]
  addHeaders?: string[]
}

/**
 * Applies CORS headers to the response based on the `ORIGIN` environment variable.
 * If not set, defaults to `*`. If no Origin header on request, bypasses CORS middleware.
 */
const cors = (config: CorsConfig = {}): MiddlewareHandler => {
  const { addHeaders = [], addMethods = [] } = config
  return async (c, next) => {
    const { ORIGIN, SECRET } = c.env as Env
    const clientOrigin = c.req.header('Origin')
    let origin: string | null = null

    // bypass middleware if no Origin header (server-side or curl)
    if (!clientOrigin) return await next()

    // check if request origin matches if ORIGIN variable is set
    if (ORIGIN && ORIGIN !== '*') {
      const originRegExp = globToRegExp(ORIGIN)
      origin = originRegExp.test(clientOrigin) ? clientOrigin : null
    } else {
      // otherwise, default to all origins
      origin = '*'
    }

    // client's origin does not match allowed origins
    // bypass CORS and default to client's same-origin policy
    if (!origin) {
      return await next()
    }

    return corsMiddleware({
      origin,
      credentials: origin === '*' ? false : true,
      allowMethods: ['GET', 'POST', 'OPTIONS', ...addMethods],
      allowHeaders: [
        origin !== '*' && 'Authorization',
        SECRET && 'X-Api-Key',
        ...addHeaders
      ].filter(Boolean)
    })(c, next)
  }
}
export default cors
