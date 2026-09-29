import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { PORTED_SITES } from '@/pages-home/port-css'
import { THEMES, themeVars } from '@/sites/themes'

function prototypeTokens(site: string): Map<string, string> {
  const css = fs.readFileSync(path.resolve(__dirname, `../../src/pages-home/${site}/${site}.generated.css`), 'utf8')
  const tokens = new Map<string, string>()
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type !== 'root' || rule.selector !== `html[data-site="${site}"]`) return
    rule.walkDecls(/^--/, (d) => {
      tokens.set(d.prop, d.value.trim().toLowerCase())
    })
  })
  return tokens
}

describe('prototype tokens agree with the app themes', () => {
  for (const site of PORTED_SITES) {
    it(site, () => {
      const proto = prototypeTokens(site)
      const app = themeVars(THEMES[site]) as Record<string, string>
      const mismatches = Object.entries(app)
        .filter(([k, v]) => /^#[0-9a-f]{6}$/i.test(String(v)) && proto.has(k) && /^#[0-9a-f]{6}$/.test(proto.get(k)!) && proto.get(k) !== String(v).toLowerCase())
        .map(([k, v]) => `${k}: app ${v}, prototype ${proto.get(k)}`)
      expect(mismatches).toEqual([])
    })
  }
})

describe('generated CSS keeps nested rules unscoped', () => {
  for (const site of PORTED_SITES) {
    it(site, () => {
      const css = fs.readFileSync(path.resolve(__dirname, `../../src/pages-home/${site}/${site}.generated.css`), 'utf8')
      const bad: string[] = []
      postcss.parse(css).walkRules((r) => {
        let p = r.parent
        while (p && p.type !== 'root') {
          if (p.type === 'rule') { if (r.selector.includes('html[data-site=')) bad.push(r.selector); return }
          p = p.parent
        }
      })
      expect(bad).toEqual([])
    })
  }
})
