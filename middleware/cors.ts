import { cors as corsMiddleware } from 'hono/cors'
import type { MiddlewareHandler } from 'hono/types'

import type { Env } from '../lib/types'

export interface CorsConfig {
  addMethods?: string[]
  addHeaders?: string[]
}

/** Applies CORS headers to the response. */
const cors = (config: CorsConfig = {}): MiddlewareHandler => {
  const { addHeaders = [], addMethods = [] } = config
  return (c, next) => {
    const { ORIGIN, SECRET } = c.env as Env
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
export default cors
