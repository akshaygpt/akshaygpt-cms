import { mkdtempSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  bookToItem,
  byDateDesc,
  filterByTag,
  findByHref,
  formatDate,
  isScheduled,
  listed,
  parseDate,
  splitByVenue,
  tagsOf,
  today,
  writingToItem,
  type Writing,
} from '../src'
import { readDroppedImages, readImageFolders, withMeta } from '../src/fs'

const TAGS = ['essay', 'memoir', 'tech'] as const
type Tag = (typeof TAGS)[number]

const w = (over: Partial<Writing<Tag>>): Writing<Tag> => ({
  title: 't',
  date: '2026/01/01',
  href: '/writing/t',
  type: 'art',
  ...over,
})

describe('dates', () => {
  it('prints with dashes, shortest form first', () => {
    expect(formatDate('2026/07/03')).toBe('2026-07-03')
    expect(formatDate('2026/05')).toBe('2026-05')
    expect(formatDate('2026/07/03', true)).toBe('2026')
  })

  it('parses and sorts newest first, undated last', () => {
    expect(parseDate('2026/07/03').toISOString().slice(0, 10)).toBe('2026-07-03')
    const sorted = [{ date: '2024' }, {}, { date: '2026/01' }].sort(byDateDesc)
    expect(sorted).toEqual([{ date: '2026/01' }, { date: '2024' }, {}])
  })
})

describe('tags', () => {
  const items = [{ tags: ['tech' as Tag] }, { tags: ['essay' as Tag, 'tech' as Tag] }, {}]

  it('offers only used tags, in vocabulary order', () => {
    expect(tagsOf(TAGS, items)).toEqual(['essay', 'tech'])
  })

  it('filters by a used tag and ignores anything else', () => {
    expect(filterByTag(TAGS, items, 'essay')).toMatchObject({ active: 'essay', items: [items[1]] })
    expect(filterByTag(TAGS, items, 'memoir')).toMatchObject({ active: undefined, items })
    expect(filterByTag(TAGS, items)).toMatchObject({ active: undefined, items })
  })
})

describe('today', () => {
  it('turns over at midnight in the zone it is given, not in UTC', () => {
    // 2026-10-22 19:00 UTC is already 00:30 on the 23rd in India.
    const now = Date.UTC(2026, 9, 22, 19, 0)
    expect(today('Asia/Kolkata', now)).toBe('2026/10/23')
    expect(today('UTC', now)).toBe('2026/10/22')
  })
})

describe('content', () => {
  it('routes every writing to exactly one list by venue', () => {
    const all = [w({ title: 'a' }), w({ title: 'b', venue: 'Smashing' })]
    const { own, published } = splitByVenue(all)
    expect(own.map(x => x.title)).toEqual(['a'])
    expect(published.map(x => x.title)).toEqual(['b'])
  })

  it('drops hidden entries and finds by href', () => {
    const all = [w({ href: '/a' }), w({ href: '/b', hidden: true })]
    expect(listed(all)).toHaveLength(1)
    expect(findByHref(all, '/b')?.hidden).toBe(true)
  })

  it('holds back an entry dated after today, and lets it out on the day', () => {
    const all = [w({ href: '/old', date: '2026/10/22' }), w({ href: '/new', date: '2026/10/23' })]
    expect(listed(all, '2026/10/22').map(x => x.href)).toEqual(['/old'])
    expect(listed(all, '2026/10/23')).toHaveLength(2)
    // No today, no date check — only `hidden` applies.
    expect(listed(all)).toHaveLength(2)
    expect(isScheduled(w({ date: '2026/10/23' }), '2026/10/22')).toBe(true)
    // A month-only date is out from the first of that month.
    expect(isScheduled(w({ date: '2026/11' }), '2026/10/31')).toBe(true)
    expect(isScheduled(w({ date: '2026/11' }), '2026/11/01')).toBe(false)
  })

  it('keeps `edited` off items and lists an href-less piece as plain text', () => {
    const item = writingToItem(w({ href: '', title: 'draft', edited: '2026/02/02' }))
    expect(item).not.toHaveProperty('edited')
    expect(item.href).toBeUndefined()
    expect(item.id).toBe('draft')
  })

  it('puts a book’s author on the venue line', () => {
    const item = bookToItem({ title: 'B', author: 'A', date: '2026', href: 'https://x' })
    expect(item).toMatchObject({ venue: 'A', external: true })
  })
})

describe('fs', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'cms-'))
  const now = Math.floor(Date.now() / 1000)
  const touch = (rel: string, secondsAgo = 0) => {
    const file = path.join(root, rel)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, '')
    const t = now - secondsAgo
    utimesSync(file, t, t)
  }
  touch('wall/old-one.jpg', 100)
  touch('wall/new_one.png', 10)
  touch('wall/notes.txt')
  touch('series/16.jpg', 50)
  touch('series/2.jpg', 50)
  touch('series/7.jpg', 50)
  touch('series/oops/16.jpg')
  touch('series/oops/7.jpg')
  touch('series/oops/1.jpg')

  it('reads newest first with a src, an alt and a date', () => {
    const imgs = readDroppedImages('wall', { publicDir: root })
    expect(imgs.map(i => i.file)).toEqual(['new_one.png', 'old-one.jpg'])
    expect(imgs[0]).toMatchObject({ src: '/wall/new_one.png', alt: 'new one' })
    expect(imgs[0].added).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
  })

  it('reads oldest first, breaking ties by filename, skipping folders', () => {
    const imgs = readDroppedImages('series', { publicDir: root, order: 'oldest' })
    expect(imgs.map(i => i.file)).toEqual(['2.jpg', '7.jpg', '16.jpg'])
  })

  it('treats a missing folder as empty', () => {
    expect(readDroppedImages('nope', { publicDir: root })).toEqual([])
    expect(readImageFolders('nope', { publicDir: root })).toEqual([])
  })

  it('lets metadata override the derived alt and date', () => {
    const [img] = withMeta(readDroppedImages('wall', { publicDir: root }), {
      'new_one.png': { alt: 'stated', added: '2020/01/01', artist: 'X' },
    })
    expect(img).toMatchObject({ alt: 'stated', added: '2020/01/01', artist: 'X' })
  })

  it('reads subfolders in filename order unless pinned', () => {
    expect(readImageFolders('series', { publicDir: root })[0].images).toEqual([
      '/series/oops/1.jpg',
      '/series/oops/7.jpg',
      '/series/oops/16.jpg',
    ])
    const pinned = readImageFolders('series', {
      publicDir: root,
      panelOrder: { oops: ['16.jpg', '7.jpg'] },
    })
    expect(pinned[0].images.map(s => path.basename(s))).toEqual(['16.jpg', '7.jpg', '1.jpg'])
  })
})
