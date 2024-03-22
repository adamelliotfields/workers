import { HTTPException } from 'hono/http-exception'
import type { MiddlewareHandler } from 'hono/types'

const secret = (): MiddlewareHandler => {
  return async (c, next) => {
    const secret = c.env.SECRET
    if (!secret) return await next()

    const url = new URL(c.req.url)
    const apiKeyHeader = c.req.header('X-Api-Key')
    const apiKeyQuery = url.searchParams.get('api_key')
    const apiKey = apiKeyQuery ?? apiKeyHeader // query takes priority

    if (apiKey !== secret) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    await next()
  }
}
export default secret
