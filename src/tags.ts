// Tags come from a controlled, ordered vocabulary the site declares once
// (`const TAGS = [...] as const`). Wherever tags are shown they read in that
// order, so a tag keeps its place.

/** The tags a list actually uses, in the vocabulary's own order. A tag nothing
 *  carries is never offered, so a filter can never lead to an empty list. */
export const tagsOf = <Tag extends string>(
  vocabulary: readonly Tag[],
  items: { tags?: Tag[] }[],
): Tag[] => vocabulary.filter(tag => items.some(item => item.tags?.includes(tag)))

/** Narrow a list to one tag, as a section page does for ?tag=. A tag the list
 *  does not use — or none — is no filter at all: the whole list comes back and
 *  `active` is undefined. `tags` is what the filter row should offer. */
export const filterByTag = <Tag extends string, T extends { tags?: Tag[] }>(
  vocabulary: readonly Tag[],
  items: T[],
  tag?: string,
): { tags: Tag[]; active?: Tag; items: T[] } => {
  const tags = tagsOf(vocabulary, items)
  const active = tags.find(t => t === tag)
  return {
    tags,
    active,
    items: active ? items.filter(item => item.tags?.includes(active)) : items,
  }
}
