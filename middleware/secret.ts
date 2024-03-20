import { HTTPException } from 'hono/http-exception'
import type { MiddlewareHandler } from 'hono/types'

/**
 * Looks for `X-Api-Key` header or `?api_key` query parameter and compares it to the `SECRET` environment variable.
 * If `env.SECRET` is not set, then the API is assumed public.
 */
const secret = (): MiddlewareHandler => {
  return async (c, next) => {
    const secret = c.env.SECRET
    if (!secret) return await next()

    const url = new URL(c.req.url)
    const apiKeyHeader = c.req.header('X-Api-Key')
    const apiKeyQuery = url.searchParams.get('api_key')
    const apiKey = apiKeyHeader ?? apiKeyQuery

    if (apiKey !== secret) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    await next()
  }
}
export default secret
