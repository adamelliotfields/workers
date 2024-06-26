import { HTTPException } from 'hono/http-exception'
import type { MiddlewareHandler } from 'hono/types'

import type { Env } from '../utils/types'

export default function secret(): MiddlewareHandler {
  return (c, next) => {
    const { SECRET: secret } = (c.env as Env) || {} // undefined in tests
    if (!secret) return next()

    const url = new URL(c.req.url)
    const apiKeyHeader = c.req.header('X-Api-Key')
    const apiKeyQuery = url.searchParams.get('api_key')
    const apiKey = apiKeyQuery ?? apiKeyHeader // query takes priority

    if (apiKey !== secret) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    return next()
  }
}
