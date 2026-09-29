/** The prototypes set the last phrase of each hero headline in gold. The heading text
    comes from the admin, so gold applies only while it still ends with that phrase. */
export function goldTail(heading: string, phrase: string | null): [string, string | null] {
  const text = heading.trim()
  if (!phrase || !text.endsWith(phrase) || text === phrase) return [text, null]
  return [text.slice(0, -phrase.length).trimEnd(), phrase]
}

/** Parts of the gold phrase that must not break across lines (split after each comma):
    "On Time, Every Time." sets as ON TIME, / EVERY TIME. instead of ON / TIME, EVERY / TIME. */
export function keepTogether(phrase: string): string[] {
  return phrase.split(/(?<=,)\s+/).filter(Boolean)
}
