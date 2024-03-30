import { HTTPException } from 'hono/http-exception'
import type { MiddlewareHandler } from 'hono/types'

import type { Env } from '../utils/types'

type Var = keyof Env

/** Takes an array of strings and throws a 503 exception if not in `env`. */
export default function env(vars: Var[]): MiddlewareHandler {
  return (c, next) => {
    const env = (c.env as Env) || {} // undefined in tests

    for (const key of vars) {
      if (!(key in env)) {
        throw new HTTPException(503, { message: 'Service Unavailable' })
      }
    }

    return next()
  }
}
