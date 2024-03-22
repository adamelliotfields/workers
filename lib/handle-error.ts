import { HTTPException } from 'hono/http-exception'
import type { ErrorHandler } from 'hono/types'

const handleError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  return c.text(err.message, { status: 500 })
}
export default handleError
