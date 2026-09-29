/* FAQ (answers are placeholders until the owner confirms them) */
export function Faq() {
  return (
    <section className="sec faq lane-top" id="faq" aria-labelledby="faqTitle">
      <div className="wrap">
        <p className="label">Questions</p>
        <h2 className="h-section" id="faqTitle" data-split>
          Before <span className="gold">you ask.</span>
        </h2>
        <div className="faq-list">
          <details>
            <summary>How soon can you pick up?</summary>
            <p className="ph">Same-day courier runs when a truck is free; most freight and moves are booked a few days ahead.</p>
          </details>
          <details>
            <summary>Which areas do you cover?</summary>
            <p>Anywhere in the United States. We&apos;re based in San Diego and run freight and moves coast to coast.</p>
          </details>
          <details>
            <summary>What won&apos;t you move?</summary>
            <p className="ph">Hazardous materials, firearms, live animals and anything illegal to transport.</p>
          </details>
          <details>
            <summary>Are loads insured?</summary>
            <p className="ph">To confirm before launch: what cover applies and up to what value.</p>
          </details>
        </div>
      </div>
    </section>
  )
}
