import { cors as corsMiddleware } from 'hono/cors'
import type { MiddlewareHandler } from 'hono/types'

import type { Env } from '../utils/types'

export interface CorsConfig {
  addMethods?: string[]
  addHeaders?: string[]
}

/**
 * Applies CORS headers to the response based on the `ORIGIN` environment variable.
 * If not set, defaults `Access-Control-Allow-Origin` to `*`.
 */
export default function cors(config: CorsConfig = {}): MiddlewareHandler {
  const { addHeaders = [], addMethods = [] } = config
  return async (c, next) => {
    const { ORIGIN, SECRET } = (c.env as Env) || {} // undefined in tests
    const origin = ORIGIN ?? '*'

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
