import { describe, expect, it } from 'vitest'
import { goldTail } from '@/pages-home/gold'

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
