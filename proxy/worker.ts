import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import handleError from '../utils/handle-error'
import handleProxy from '../utils/handle-proxy'

import cors from '../middleware/cors'
import secret from '../middleware/secret'

const app = new Hono({ strict: false })

// error handler
app.onError(handleError)

// middleware
app.use(secret())
app.use(cors())

// proxy
app.all('*', (c, next) => {
  const { host, headers: h } = c.req.query()

  if (!host) {
    throw new HTTPException(400, { message: 'Missing required "host" parameter' })
  }

  // h is an optional string separated by commas
  // e.g. "key=value,-key"
  const headers = h ? h.split(',') : undefined

  return handleProxy({ host, headers })(c, next)
})

export default app
