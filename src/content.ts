// The shapes content takes, and the helpers that turn it into sections. The
// content itself — the actual writings, the tag vocabulary, the section copy —
// belongs to the site. Everything here is generic over the site's own `Tag`
// union and media kinds, so a typo in a tag is still a type error there.

export interface Writing<Tag extends string = string, Type extends string = string> {
  title: string
  /** When it was published. This is the date everything sorts and prints by. */
  date: string
  /** When it was last revised, if it has been. Deliberately kept off
   *  SectionItem so an edit can never reorder a list. */
  edited?: string
  /** '' for a piece with no page yet — it lists as plain text. */
  href: string
  external?: boolean
  type: Type
  tags?: Tag[]
  /** Where it was published. Omit for self-published. */
  venue?: string
  excerpt?: string
  featured?: boolean
  /** Kept off every list while the page stays live for anyone with the link. */
  hidden?: boolean
}

export interface Book {
  title: string
  author: string
  /** When it was finished. */
  date: string
  href?: string
  note?: string
}

export interface SectionItem<Tag extends string = string, Kind extends string = string> {
  /** Stable React key. */
  id: string
  title: string
  /** Omit for undated, ongoing work. */
  date?: string
  tags?: Tag[]
  venue?: string
  excerpt?: string
  href?: string
  /** External links open in a new tab. */
  external?: boolean
  /** A visible link printed after the excerpt. */
  link?: { href: string; label: string }
  /** Set when the item shows thumbnails instead of linking away. */
  media?: { kind: Kind; ref: string }
}

export interface Section<
  Key extends string = string,
  Tag extends string = string,
  Kind extends string = string,
> {
  key: Key
  label: string
  /** Printed under the heading on the section's own page only. */
  description?: string
  /** Kept off the homepage, the nav and the sitemap while its page stays live. */
  hidden?: boolean
  items: SectionItem<Tag, Kind>[]
}

/** Everything not marked hidden. */
export const listed = <T extends { hidden?: boolean }>(entries: T[]): T[] =>
  entries.filter(e => !e.hidden)

/** An entry by the URL it lives at — how a post page reads its own date and
 *  tags back out of the source of truth. Undefined for a page with no entry. */
export const findByHref = <T extends { href: string }>(entries: T[], href: string): T | undefined =>
  entries.find(e => e.href === href)

/** A writing is routed to exactly one list by `venue`: with one it is a
 *  publication, without one it is the author's own — so between the two, no
 *  writing goes missing. */
export const splitByVenue = <T extends { venue?: string }>(
  entries: T[],
): { own: T[]; published: T[] } => ({
  own: entries.filter(e => !e.venue),
  published: entries.filter(e => e.venue),
})

export const writingToItem = <Tag extends string, Kind extends string = string>(
  w: Writing<Tag>,
): SectionItem<Tag, Kind> => ({
  id: w.href || w.title,
  title: w.title,
  date: w.date,
  tags: w.tags,
  venue: w.venue,
  excerpt: w.excerpt,
  // A piece whose page does not exist yet carries href: '' — it lists as
  // plain text rather than as a link to nowhere.
  href: w.href || undefined,
  external: w.external,
})

/** The author rides in on `venue`, which is what the meta line under a title
 *  prints — "2026-08-14 · Ursula K. Le Guin" reads exactly right. */
export const bookToItem = <Tag extends string = string, Kind extends string = string>(
  b: Book,
): SectionItem<Tag, Kind> => ({
  id: `${b.title} — ${b.author}`,
  title: b.title,
  date: b.date,
  venue: b.author,
  excerpt: b.note,
  href: b.href,
  external: b.href?.startsWith('http'),
})
