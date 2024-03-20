import { describe, expect, it } from 'bun:test'

import parseParams, { type ParseConfig } from './parse-params'

describe('parseParams', () => {
  it('parses parameters', () => {
    const params = new URLSearchParams('foo=1&bar=2')
    const config: ParseConfig = {
      foo: [parseInt],
      bar: [parseInt]
    }
    expect(parseParams(params, config)).toEqual({ foo: 1, bar: 2 })
  })

  it('parses parameters with default values', () => {
    const params = new URLSearchParams('foo=1')
    const config: ParseConfig = {
      foo: [parseInt],
      bar: [parseInt, 2]
    }
    expect(parseParams(params, config)).toEqual({ foo: 1, bar: 2 })
  })

  it('omits keys', () => {
    const params = new URLSearchParams('foo=1&bar=2')
    const config: ParseConfig = {
      foo: [parseInt],
      bar: [parseInt]
    }
    expect(parseParams(params, config, ['bar'])).toEqual({ foo: 1 })
  })
})
