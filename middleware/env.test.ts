import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import env from './env'

describe('env', () => {
  describe('when variables are not required', () => {
    const app = new Hono()
    app.use(env([]))
    app.get('/', (c) => c.text('OK'))

    it('should allow requests', async () => {
      const res = await app.request('/', {})
      expect(res.status).toEqual(200)
      expect(await res.text()).toEqual('OK')
    })
  })

  describe('when variables are required', () => {
    const TEST1 = 'test1'
    const TEST2 = 'test2'
    const app = new Hono()
    app.use(env(['TEST1', 'TEST2']))
    app.get('/', (c) => c.text('OK'))

    it('should allow requests if all are set', async () => {
      const res = await app.request('/', {}, { TEST1, TEST2 })
      expect(res.status).toEqual(200)
      expect(await res.text()).toEqual('OK')
    })

    it('should throw 503 if none are set', async () => {
      const res = await app.request('/', {})
      expect(res.status).toEqual(503)
    })

    it('should throw 503 if one is missing', async () => {
      const res = await app.request('/', {}, { TEST1 })
      expect(res.status).toEqual(503)
    })
  })
})
