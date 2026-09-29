import { describe, expect, it } from 'vitest'
import { goldTail, keepTogether } from '@/pages-home/gold'

describe('goldTail', () => {
  it('splits off the gold phrase when the heading ends with it', () => {
    expect(goldTail('Reliable Freight. Real People. On Time, Every Time.', 'On Time, Every Time.')).toEqual(['Reliable Freight. Real People.', 'On Time, Every Time.'])
    expect(goldTail('From Blueprint to Beautiful.', 'to Beautiful.')).toEqual(['From Blueprint', 'to Beautiful.'])
  })
  it('leaves an edited heading plain', () => {
    expect(goldTail('Freight done right.', 'On Time, Every Time.')).toEqual(['Freight done right.', null])
    expect(goldTail('Anything', null)).toEqual(['Anything', null])
  })
})

describe('keepTogether', () => {
  it('splits a phrase after each comma so the parts never break across lines', () => {
    expect(keepTogether('On Time, Every Time.')).toEqual(['On Time,', 'Every Time.'])
  })
  it('keeps a phrase without commas whole', () => {
    expect(keepTogether('We Show It.')).toEqual(['We Show It.'])
    expect(keepTogether('to Beautiful.')).toEqual(['to Beautiful.'])
  })
})
