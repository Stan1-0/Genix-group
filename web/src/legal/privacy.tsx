import { formatAddress, type PostalAddress } from '@/sites/data-shape'

export const PRIVACY_UPDATED = { iso: '2026-10-10', label: 'October 10, 2026' } as const

/** Section headings in page order; the page and its tests share this list. */
export const PRIVACY_HEADINGS = [
  'Who we are',
  'What we collect',
  'How we use it',
  'Who handles it for us',
  'Cookies and tracking',
  'How long we keep it',
  'Your choices',
  'Children',
  'Changes',
  'Questions',
] as const

const PROVIDERS: [name: string, does: string, gets: string][] = [
  ['Resend', 'Sends our emails, including your confirmation', 'Your contact details and everything in your request, including links to your photos'],
  ['Cloudinary', 'Stores the photos you upload (Home Upgrades) privately', 'Your photos'],
  ['Vercel', "Hosts our sites, counts visits without cookies, and checks that forms aren't filled in by bots", 'Technical details such as your IP address and browser, and the pages you open'],
  ['Neon', 'Our database, where requests are saved', 'Everything you submit in a form'],
]

/** The Genix Group privacy policy (docs/superpowers/specs/2026-10-05-privacy-page-design.md, Appendix). */
export function PrivacyPolicy({ email, address }: { email: string; address: PostalAddress | null }) {
  const mail = <a href={`mailto:${email}`}>{email}</a>
  const [who, collect, use, handles, cookies, keep, choices, children, changes, questions] = PRIVACY_HEADINGS
  return (
    <article className="policy-body">
      <h1>Privacy policy</h1>
      <p className="policy-updated">
        Last updated <time dateTime={PRIVACY_UPDATED.iso}>{PRIVACY_UPDATED.label}</time>
      </p>
      <p>
        This policy explains what The Genix Group collects when you use thegenixgroup.com and the sites of our businesses,
        what we do with it, and your choices. We&apos;ve kept it short on purpose.
      </p>

      <h2>{who}</h2>
      <p>
        The Genix Group runs three businesses: Genix Logistics (freight, courier runs and moves), Genix Home Upgrades (accent
        walls, TV units, outdoor builds and handyman work) and Genix Multimedia. In this policy, &quot;we&quot; means The
        Genix Group and those businesses. You can reach us at {mail}
        {address ? `, or by mail at ${formatAddress(address)}` : ''}.
      </p>

      <h2>{collect}</h2>
      <p>
        When you send a request through a form, we collect what you type: your name, your phone number or email, and the
        details of your request.
      </p>
      <ul>
        <li>
          <strong>Genix Logistics:</strong> where something is going from and to (ZIP codes), the date, what&apos;s moving, and
          any notes.
        </li>
        <li>
          <strong>Genix Home Upgrades:</strong> the kind of project, whether it&apos;s for a home or a business, when you&apos;d
          like to start, a rough budget if you give one, your property ZIP, your description, any links you add, the photos you
          upload, and a best time to call if you choose one.
        </li>
        <li>
          <strong>Genix Multimedia</strong> doesn&apos;t have its own request form yet. You can message us through the group&apos;s contact form or by email, and we keep your message.
        </li>
        <li>
          <strong>The Genix Group contact form:</strong> which of our businesses your message is about, and your message.
        </li>
      </ul>
      <p>
        We also collect two technical things. To limit spam, we keep a scrambled (hashed) version of your IP address; it can&apos;t
        be turned back into your address. And our host counts visits and page speed in a way that doesn&apos;t use cookies and
        doesn&apos;t identify you.
      </p>

      <h2>{use}</h2>
      <p>
        We use your details only to reply to your request: to send you a confirmation, answer your questions, arrange a visit,
        give you a quote and do the work. We keep a record of the request so we can follow up. We use scrambled IP addresses only
        to limit spam. We don&apos;t send marketing emails, we don&apos;t use your details for advertising, and we never sell
        them.
      </p>

      <h2>{handles}</h2>
      <table className="policy-table" role="table">
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Service</th>
            <th scope="col" role="columnheader">What it does for us</th>
            <th scope="col" role="columnheader">What it receives</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {PROVIDERS.map(([name, does, gets]) => (
            <tr key={name} role="row">
              <th scope="row" role="rowheader">{name}</th>
              <td role="cell" data-label="What it does for us">{does}</td>
              <td role="cell" data-label="What it receives">{gets}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        These companies handle your information to provide those services to us, under their own terms and privacy policies. We
        read your request in our own email inbox. We don&apos;t give your details to anyone else unless the law requires it.
      </p>

      <h2>{cookies}</h2>
      <p>
        We don&apos;t use advertising or tracking cookies, and there is no cookie banner because there is nothing to ask you
        about. (Our own staff get a login cookie when they sign in to manage the sites; visitors don&apos;t.) We don&apos;t track
        you across other websites, so a &quot;Do Not Track&quot; signal from your browser doesn&apos;t change how our sites work.
      </p>

      <h2>{keep}</h2>
      <p>
        We keep a request for as long as we need it to follow up and for our business records. If you ask us to delete it, we
        will, including any photos you uploaded. Photos that were uploaded but never sent with a request are removed
        automatically within a couple of days.
      </p>

      <h2>{choices}</h2>
      <p>
        You can ask us what we hold about you, to correct it, or to delete it. Email {mail} from the address you used and tell
        us what you need. We&apos;ll reply within 45 days. California law gives California residents these rights, and we&apos;ll
        honor a request from anyone. We won&apos;t treat you differently for asking.
      </p>

      <h2>{children}</h2>
      <p>
        Our sites are for adults arranging work. They aren&apos;t directed to children under 13, and we don&apos;t knowingly
        collect their information.
      </p>

      <h2>{changes}</h2>
      <p>
        If we change this policy, we&apos;ll update the date at the top. If the change is significant, we&apos;ll say so on this
        page.
      </p>

      <h2>{questions}</h2>
      <p>Write to {mail}.</p>
    </article>
  )
}
