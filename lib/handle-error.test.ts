import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import handleError from './handle-error'

describe('handleError', () => {
  it('should handle thrown HTTPExceptions', async () => {
    const app = new Hono()
    app.onError(handleError)
    app.get('/', () => {
      throw new HTTPException(400, { message: 'Bad Request' })
    })

    // make the request
    const res = await app.request('/')
    expect(res.status).toBe(400)
    expect(await res.text()).toBe('Bad Request')
    expect(res.headers.get('content-type')).toBe(null)
  })

  it('should handle thrown Errors', async () => {
    const app = new Hono()
    app.onError(handleError)
    app.get('/', () => {
      throw new Error('Not an internal server error')
    })

    // make the request
    const res = await app.request('/')
    const [contentType] = res.headers.get('content-type').split(';')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('Not an internal server error')
    expect(contentType).toBe('text/plain')
  })
})
