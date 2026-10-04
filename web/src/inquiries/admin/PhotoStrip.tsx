import { fullUrl, photoSettings, thumbUrl } from '@/inquiries/photos'

/** Admin: thumbnails for a Home Upgrades enquiry's photos; full-size links last one hour. Server component: Payload passes the document as `data`. */
export function PhotoStrip({ data }: { data?: { details?: { photos?: string[] } } }) {
  const ids = data?.details?.photos ?? []
  const s = photoSettings(process.env)
  if (!ids.length) return null
  if (!s) return <p>{ids.length} photo(s) attached; Cloudinary settings are missing, so they can&apos;t be shown.</p>
  const exp = Math.floor(Date.now() / 1000) + 3600
  return (
    <div style={{ margin: '0 0 24px' }}>
      <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Photos ({ids.length})</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ids.map((id) => (
          <a key={id} href={fullUrl(s, id, exp)} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl(s, id)} width={120} height={120} alt="Customer photo" style={{ borderRadius: 8, objectFit: 'cover' }} />
          </a>
        ))}
      </div>
    </div>
  )
}
