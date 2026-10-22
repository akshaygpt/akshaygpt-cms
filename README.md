# @akshaygpt/cms

The content engine behind [akshaygpt.com](https://akshaygpt.com). It holds no
content. The site keeps its own writings, tag vocabulary and section copy, and
this package supplies the types and the logic that turn them into pages.

- **`@akshaygpt/cms`** is pure and safe anywhere: the content types, date
  formatting, venue routing, tag filtering, and the writing-to-row and
  book-to-row mappers.
- **`@akshaygpt/cms/fs`** is server-only: folders under `/public` read as
  content. Drop a file in and it's up, with no code change.

There are no runtime dependencies. The build is a minified ESM bundle with type
declarations.

## Use

```ts
import { filterByTag, formatDate, splitByVenue, writingToItem, type Writing } from '@akshaygpt/cms'
import { readDroppedImages, withMeta } from '@akshaygpt/cms/fs'

export const TAGS = ['essay', 'memoir', 'tech'] as const
export type Tag = (typeof TAGS)[number]

const writings: Writing<Tag>[] = [/* … */]
const { own, published } = splitByVenue(writings)

// On a section page, ?tag=memoir:
const { tags, active, items } = filterByTag(TAGS, own.map(writingToItem), 'memoir')

// /public/art-i-like, newest first, with optional credits keyed by filename:
const art = withMeta(readDroppedImages('art-i-like'), { 'swan.jpg': { artist: 'Hilma af Klint' } })
```

Dates are `YYYY/MM/DD` strings (or `YYYY/MM`, `YYYY`) and sort by plain string
compare.

### Scheduling

A writing dated after today is scheduled: `listed(entries, today('Asia/Kolkata'))`
leaves it out, along with anything `hidden`, until its day starts in that zone.
Push it whenever; it comes out on its date. Call `listed` per render rather than
once at module load, or a server that stays up past midnight keeps yesterday's
list. `isScheduled(entry, today)` answers the same question for one entry, so a
post page can mark itself noindex until then.

## Develop

```bash
npm install
npm test          # vitest
npm run build     # tsup → dist/
```

To try a change in the site before publishing, run `npm link` here and then
`npm link @akshaygpt/cms` in the site.

## Release

```bash
npm version patch   # or minor / major
npm publish         # runs typecheck, tests and build first
```
