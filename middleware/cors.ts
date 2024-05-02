import { cors as corsMiddleware } from 'hono/cors'
import type { MiddlewareHandler } from 'hono/types'

import type { Env } from '../utils/types'

export interface CorsConfig {
  methods?: string[]
  headers?: string[]
}

/**
 * Applies CORS headers to the response based on the `ORIGIN` environment variable.
 * If not set, defaults `Access-Control-Allow-Origin` to `*`.
 */
export default function cors(config: CorsConfig = {}): MiddlewareHandler {
  const { headers = [], methods = [] } = config

  return (c, next) => {
    const { ORIGIN, SECRET } = (c.env as Env) || {} // undefined in tests
    const origin = ORIGIN ?? '*'

    return corsMiddleware({
      origin,
      credentials: origin !== '*',
      allowMethods: ['GET', 'POST', 'OPTIONS', ...methods],
      allowHeaders: [
        origin !== '*' && 'Authorization',
        SECRET && 'X-Api-Key',
        ...headers
      ].filter(Boolean)
    })(c, next)
  }
}
