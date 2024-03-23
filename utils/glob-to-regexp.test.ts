import { describe, expect, it } from 'bun:test'

import globToRegExp from './glob-to-regexp'

describe('globToRegExp', () => {
  it('should convert a glob file pattern to a regular expression', () => {
    const pattern = '*.js'
    const regex = globToRegExp(pattern)
    expect(regex.source).toBe('^.*\\.js$')
    expect(regex.test('index.js')).toBe(true)
    expect(regex.test('index.ts')).toBe(false)
  })

  it('should convert a glob URL pattern to a regular expression', () => {
    const pattern = 'http://*example.com'
    const regex = globToRegExp(pattern)
    expect(regex.source).toBe('^http:\\/\\/.*example\\.com$')
    expect(regex.test('http://example.com')).toBe(true)
    expect(regex.test('http://www.example.com')).toBe(true)
    expect(regex.test('http://www1.www2.example.com')).toBe(true)
    expect(regex.test('http://example.org')).toBe(false) // different TLD
    expect(regex.test('https://example.com')).toBe(false) // different protocol
  })

  it('should handle a pattern with dots', () => {
    const pattern = 'http://*.example.com'
    const regex = globToRegExp(pattern)
    expect(regex.source).toBe('^http:\\/\\/.*\\.example\\.com$')
    expect(regex.test('http://www.example.com')).toBe(true)
    expect(regex.test('http://www1.www2.example.com')).toBe(true)
    expect(regex.test('http://example.com')).toBe(false) // no subdomain
  })

  it('should handle a pattern with hyphens', () => {
    const pattern = 'http://*-example.com'
    const regex = globToRegExp(pattern)
    expect(regex.source).toBe('^http:\\/\\/.*-example\\.com$')
    expect(regex.test('http://-example.com')).toBe(true)
    expect(regex.test('http://www-example.com')).toBe(true)
    expect(regex.test('http://example.com')).toBe(false)
  })

  it('should handle multiple wildcards in a pattern', () => {
    const pattern = '*://*.example.com'
    const regex = globToRegExp(pattern)
    expect(regex.source).toBe('^.*:\\/\\/.*\\.example\\.com$')
    expect(regex.test('http://www.example.com')).toBe(true)
    expect(regex.test('https://www.example.com')).toBe(true)
    expect(regex.test('http://example.com')).toBe(false)
  })

  it('should handle question marks as a single character wildcard', () => {
    const pattern = 'file?.txt'
    const regex = globToRegExp(pattern)
    expect(regex.source).toBe('^file.\\.txt$')
    expect(regex.test('file1.txt')).toBe(true)
    expect(regex.test('file2.txt')).toBe(true)
    expect(regex.test('file.txt')).toBe(false)
  })

  it('should handle patterns without wildcards', () => {
    const pattern = 'http://example.com'
    const regex = globToRegExp(pattern)
    expect(regex.source).toBe('^http:\\/\\/example\\.com$')
    expect(regex.test('http://example.com')).toBe(true)
    expect(regex.test('http://www.example.com')).toBe(false)
  })
})
