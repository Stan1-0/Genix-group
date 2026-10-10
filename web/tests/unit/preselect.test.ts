import { describe, expect, it } from 'vitest'
import { parseHuPreselect, parseLogisticsPreselect } from '@/inquiries/forms/preselect'

describe('parseLogisticsPreselect', () => {
  it('accepts business and move only', () => {
    expect(parseLogisticsPreselect({ kind: 'move' })).toEqual({ kind: 'move' })
    expect(parseLogisticsPreselect({ kind: 'business' })).toEqual({ kind: 'business' })
    for (const kind of ['truck', '', 'MOVE', '<script>', undefined]) expect(parseLogisticsPreselect({ kind })).toEqual({})
    expect(parseLogisticsPreselect({ kind: ['move', 'business'] })).toEqual({})
  })
})

describe('parseHuPreselect', () => {
  it('accepts the allowed project and property values independently', () => {
    expect(parseHuPreselect({ project: 'accent', property: 'business' })).toEqual({ project: 'accent', property: 'business' })
    expect(parseHuPreselect({ project: 'outdoor' })).toEqual({ project: 'outdoor' })
    expect(parseHuPreselect({ project: 'renovation', property: 'home' })).toEqual({ property: 'home' })
    expect(parseHuPreselect({ project: ['accent'], property: 'office' })).toEqual({})
    expect(parseHuPreselect({})).toEqual({})
  })
})
