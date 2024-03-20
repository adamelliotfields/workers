import { describe, expect, it } from 'bun:test'

import pickHeaders from './pick-headers'

describe('pickHeaders', () => {
  it('should pick headers with strings', () => {
    const headers = new Headers()
    headers.set('a', '1')
    headers.set('b', '2')
    expect(pickHeaders(headers, ['a', 'b'])).toEqual(new Headers({ a: '1', b: '2' }))
  })

  it('should pick headers with regex', () => {
    const headers = new Headers()
    headers.set('foo', '1')
    headers.set('bar', '2')
    expect(pickHeaders(headers, [/^f/])).toEqual(new Headers({ foo: '1' }))
  })
})
