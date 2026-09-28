export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON.stringify output is safe here except for "<", escaped to keep </script> out.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
