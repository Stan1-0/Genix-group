import { expect, test } from '@playwright/test'

const HOME = 'http://homeupgrades.localhost:3000/'

test('home Recent work shows the three featured projects', async ({ page }) => {
  await page.goto(HOME)
  await expect(page.locator('#work .work-card b')).toHaveText(['Accent wall', 'Custom TV unit', 'Accent wall'])
  await expect(page.locator('#work .work-card').nth(1)).toHaveAttribute('data-kind', 'video')
})

test('the viewer steps through a gallery with buttons and arrow keys, Esc returns focus', async ({ page }) => {
  await page.goto(HOME)
  const card = page.locator('#work .work-card').first()
  await card.evaluate((el) => {
    el.setAttribute('data-gallery', JSON.stringify([
      { src: '/brand/hu-project-feature-wall.jpg', alt: 'First photo' },
      { src: '/brand/hu-tv-mount.jpg', alt: 'Second photo' },
      { src: '/brand/hu-project-marble-wall.jpg', alt: 'Third photo' },
    ]))
  })
  await card.click()
  const dlg = page.locator('dialog#viewer')
  await expect(dlg).toBeVisible()
  await expect(page.locator('#viewerNav')).toBeVisible()
  await expect(page.locator('#viewerCount')).toHaveText('1 / 3')
  await page.locator('#viewerNext').click()
  await expect(page.locator('#viewerCount')).toHaveText('2 / 3')
  await expect(dlg.locator('img.viewer-media')).toHaveAttribute('alt', 'Second photo')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#viewerCount')).toHaveText('3 / 3')
  await page.keyboard.press('ArrowRight') // wraps
  await expect(page.locator('#viewerCount')).toHaveText('1 / 3')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('#viewerCount')).toHaveText('3 / 3')
  await page.keyboard.press('Escape')
  await expect(dlg).toBeHidden()
  await expect(card).toBeFocused()
})

test('a single-photo project shows no prev/next; a video project plays', async ({ page }) => {
  await page.goto(HOME)
  await page.locator('#work .work-card').first().click()
  await expect(page.locator('#viewerNav')).toBeHidden()
  await page.keyboard.press('Escape')
  await page.locator('#work .work-card').nth(1).click()
  await expect(page.locator('dialog#viewer video.viewer-media')).toHaveAttribute('src', '/brand/hu-project.mp4')
  await expect(page.locator('#viewerNav')).toBeHidden()
})
