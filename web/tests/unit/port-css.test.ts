import { describe, expect, it } from 'vitest'
import postcss from 'postcss'
import { fontOverrides, portCss, scopeSelector } from '@/pages-home/port-css'

const S = 'html[data-site="logistics"]'

describe('scopeSelector', () => {
  it('maps :root, html and the own division to the site root', () => {
    expect(scopeSelector(':root', 'logistics')).toBe(S)
    expect(scopeSelector('html', 'logistics')).toBe(S)
    expect(scopeSelector('html.lenis body', 'logistics')).toBe(`${S}.lenis body`)
    expect(scopeSelector('[data-division="logistics"]', 'logistics')).toBe(S)
    expect(scopeSelector('[data-division="logistics"] .hero', 'logistics')).toBe(`${S} .hero`)
  })
  it('drops rules for another division', () => {
    expect(scopeSelector('[data-division="homeupgrades"] .x', 'logistics')).toBeNull()
  })
  it('attaches html state classes to the root', () => {
    expect(scopeSelector('.h1-pending .hero h1', 'logistics')).toBe(`${S}.h1-pending .hero h1`)
    expect(scopeSelector('.js .menu-btn', 'logistics')).toBe(`${S}.js .menu-btn`)
    expect(scopeSelector('.js-motion [data-reveal]', 'logistics')).toBe(`${S}.js-motion [data-reveal]`)
  })
  it('prefixes everything else', () => {
    expect(scopeSelector('body', 'logistics')).toBe(`${S} body`)
    expect(scopeSelector('*::before', 'logistics')).toBe(`${S} *::before`)
    expect(scopeSelector('.hero > h1', 'logistics')).toBe(`${S} .hero > h1`)
    expect(scopeSelector('.javascript-free', 'logistics')).toBe(`${S} .javascript-free`)
  })
})

describe('portCss', () => {
  it('scopes rules inside @media, keeps keyframes, rewrites asset urls, drops emptied rules', () => {
    const out = portCss(
      `@media (max-width: 960px) { .a, [data-division="hub"] .b { color: red } }
       @keyframes spin { from { transform: none } to { transform: rotate(1turn) } }
       .c { background: url("../assets/hu-ba-finished.jpg") } .d { background: url(assets/x.svg) }
       [data-division="homeupgrades"] .gone { color: blue }`,
      'logistics',
    )
    expect(out).toContain(`${S} .a {`)
    const media = postcss.parse(out).first as import('postcss').AtRule
    expect(media.name).toBe('media')
    const sels: string[] = []
    media.walkRules((r) => { sels.push(r.selector) })
    expect(sels).toEqual([`${S} .a`])
    expect(out).toContain('from { transform: none }')
    expect(out).toContain('url("/brand/hu-ba-finished.jpg")')
    expect(out).toContain('url(/brand/x.svg)')
    expect(out).not.toContain('.gone')
  })
})

describe('fontOverrides', () => {
  it('points the prototype font variables at next/font variables', () => {
    expect(fontOverrides('logistics')).toBe(
      `${S} { --f-display: var(--font-archivo), system-ui, sans-serif; --f-body: var(--font-archivo), system-ui, sans-serif; --f-mono: var(--font-plex-mono), ui-monospace, monospace; }`,
    )
  })
})

describe('native CSS nesting', () => {
  const rulesWithRuleAncestor = (css: string) => {
    const found: string[] = []
    postcss.parse(css).walkRules((r) => {
      let p = r.parent
      while (p && p.type !== 'root') {
        if (p.type === 'rule') { found.push(r.selector); return }
        p = p.parent
      }
    })
    return found
  }
  it('scopes only the outer rule; nested rules keep their selectors', () => {
    const out = portCss(
      `:where([data-division="logistics"]) { .mono { color: red } @media (max-width: 760px) { .road { top: 0 } } }`,
      'logistics',
    )
    const root = postcss.parse(out)
    const top: string[] = []
    root.each((n) => { if (n.type === 'rule') top.push(n.selector) })
    expect(top).toEqual([S])
    expect(rulesWithRuleAncestor(out).sort()).toEqual(['.mono', '.road'])
  })
  it('drops :where() rules for another division', () => {
    expect(portCss(`:where([data-division="homeupgrades"]) .x { color: red }`, 'logistics').trim()).toBe('')
  })
  it('maps a leading :where() own-division to the site root', () => {
    expect(scopeSelector(':where([data-division="logistics"]) .x', 'logistics')).toBe(`${S} .x`)
    expect(scopeSelector(':where([data-division="hub"])', 'logistics')).toBeNull()
  })
})
