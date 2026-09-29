import postcss, { type AtRule, type Rule } from 'postcss'
import { SITE_KEYS, type SiteKey } from '@/sites/config'
import { FONT_VARS, THEMES } from '@/sites/themes'

/* Build-time only (scripts/port-css.ts and tests): turns prototype CSS into
   CSS scoped to one site. Never imported by app code. */

// Classes the prototypes toggle on <html> (menu-open goes on the header, not here); selectors starting with them attach to the root.
const HTML_CLASSES = ['js', 'js-motion', 'h1-pending', 'lenis', 'lenis-smooth', 'lenis-stopped', 'lenis-scrolling', 'logo-dock', 'logo-docked']

const root = (site: SiteKey) => `html[data-site="${site}"]`

export function scopeSelector(selector: string, site: SiteKey): string | null {
  const sel = selector.trim()
  const division = /^(?::where\(\[data-division="([a-z]+)"\]\)|\[data-division="([a-z]+)"\])/.exec(sel)
  if (division) return (division[1] ?? division[2]) === site ? root(site) + sel.slice(division[0].length) : null
  if (/^:root(?![\w-])/.test(sel)) return root(site) + sel.slice(':root'.length)
  if (/^html(?![\w-])/.test(sel)) return root(site) + sel.slice('html'.length)
  const cls = /^\.([\w-]+)/.exec(sel)
  if (cls && HTML_CLASSES.includes(cls[1])) return root(site) + sel
  return `${root(site)} ${sel}`
}

const hasRuleAncestor = (rule: Rule) => {
  for (let p = rule.parent; p && p.type !== 'root'; p = p.parent) if (p.type === 'rule') return true
  return false
}

const inKeyframes = (rule: Rule) => {
  let p = rule.parent
  while (p && p.type !== 'root') {
    if (p.type === 'atrule' && /keyframes$/i.test((p as AtRule).name)) return true
    p = p.parent
  }
  return false
}

export function portCss(css: string, site: SiteKey): string {
  const tree = postcss.parse(css)
  tree.walkRules((rule) => {
    if (inKeyframes(rule) || hasRuleAncestor(rule)) return // nested rules resolve against their scoped parent
    const scoped = rule.selectors.map((s) => scopeSelector(s, site)).filter((s): s is string => s !== null)
    if (scoped.length === 0) rule.remove()
    else rule.selectors = scoped
  })
  tree.walkDecls((decl) => {
    decl.value = decl.value.replace(/url\((['"]?)(?:\.\.\/)?assets\//g, 'url($1/brand/')
  })
  tree.walkAtRules((at) => {
    if (at.nodes && at.nodes.length === 0) at.remove()
  })
  return tree.toString()
}

export function fontOverrides(site: SiteKey): string {
  const t = THEMES[site]
  return `${root(site)} { --f-display: var(${FONT_VARS[t.fontDisplay]}), system-ui, sans-serif; --f-body: var(${FONT_VARS[t.fontBody]}), system-ui, sans-serif; --f-mono: var(${FONT_VARS[t.fontMono]}), ui-monospace, monospace; }`
}

export const PORTED_SITES = SITE_KEYS.filter((k) => k !== 'multimedia')
