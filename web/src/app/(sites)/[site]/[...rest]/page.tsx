import { notFound } from 'next/navigation'

// Any path a site does not define renders that site's themed not-found page.
export default function UnknownPage() {
  notFound()
}
