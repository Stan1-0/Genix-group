import { describe, expect, it } from 'vitest'
import { routeRequest, siteForRequest } from '@/sites/routing'

const root = 'thegenixgroup.com'

describe('siteForRequest', () => {
  it('uses the host when it is a known site', () => {
    expect(siteForRequest('logistics.thegenixgroup.com', { root, previewSite: 'multimedia', allowPreview: true })).toBe('logistics')
  })
  it('falls back to the hub for unknown hosts', () => {
    expect(siteForRequest('genix-abc.vercel.app', { root, previewSite: null, allowPreview: true })).toBe('hub')
  })
  it('lets preview hosts pick a site, but only when allowed and valid', () => {
    expect(siteForRequest('genix-abc.vercel.app', { root, previewSite: 'homeupgrades', allowPreview: true })).toBe('homeupgrades')
    expect(siteForRequest('genix-abc.vercel.app', { root, previewSite: 'homeupgrades', allowPreview: false })).toBe('hub')
    expect(siteForRequest('genix-abc.vercel.app', { root, previewSite: 'admin', allowPreview: true })).toBe('hub')
  })
})

describe('routeRequest', () => {
  it('rewrites site pages into the [site] segment', () => {
    expect(routeRequest('logistics', '/')).toEqual({ kind: 'rewrite', pathname: '/logistics' })
    expect(routeRequest('logistics', '/services')).toEqual({ kind: 'rewrite', pathname: '/logistics/services' })
    expect(routeRequest('hub', '/about')).toEqual({ kind: 'rewrite', pathname: '/hub/about' })
    expect(routeRequest('homeupgrades', '/sitemap.xml')).toEqual({ kind: 'rewrite', pathname: '/homeupgrades/sitemap.xml' })
  })
  it('passes through paths already inside the site segment (generated OG image URLs)', () => {
    expect(routeRequest('logistics', '/logistics/opengraph-image')).toEqual({ kind: 'next' })
  })
  it('does not let one site reach another site segment', () => {
    expect(routeRequest('hub', '/logistics')).toEqual({ kind: 'rewrite', pathname: '/hub/logistics' })
  })
  it('serves Payload only on the hub', () => {
    expect(routeRequest('hub', '/admin')).toEqual({ kind: 'next' })
    expect(routeRequest('hub', '/admin/collections/sites')).toEqual({ kind: 'next' })
    expect(routeRequest('hub', '/api/users/me')).toEqual({ kind: 'next' })
    expect(routeRequest('logistics', '/admin')).toEqual({ kind: 'notFound' })
    expect(routeRequest('multimedia', '/api/sites')).toEqual({ kind: 'notFound' })
  })
  it('does not treat look-alike paths as Payload', () => {
    expect(routeRequest('hub', '/administration')).toEqual({ kind: 'rewrite', pathname: '/hub/administration' })
  })
  it('allows media files on every site, but leaves other /api paths hub-only', () => {
    expect(routeRequest('logistics', '/api/media/file/hero.jpg')).toEqual({ kind: 'next' })
    expect(routeRequest('multimedia', '/api/media/file/logo.svg')).toEqual({ kind: 'next' })
    expect(routeRequest('logistics', '/api/media')).toEqual({ kind: 'notFound' })
    expect(routeRequest('logistics', '/api/users')).toEqual({ kind: 'notFound' })
  })
  it('404s Payload paths on an unresolved host in production, except media files', () => {
    const opts = { hostResolved: false, isProduction: true }
    expect(routeRequest('hub', '/admin', opts)).toEqual({ kind: 'notFound' })
    expect(routeRequest('hub', '/api/users', opts)).toEqual({ kind: 'notFound' })
    expect(routeRequest('hub', '/api/media/file/hero.jpg', opts)).toEqual({ kind: 'next' })
  })
  it('does not 404 Payload paths for an unresolved host outside production, or a resolved host in production', () => {
    expect(routeRequest('hub', '/admin', { hostResolved: false, isProduction: false })).toEqual({ kind: 'next' })
    expect(routeRequest('hub', '/admin', { hostResolved: true, isProduction: true })).toEqual({ kind: 'next' })
  })
})
