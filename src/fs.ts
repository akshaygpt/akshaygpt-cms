// Server-only. Folders under /public as content: drop a file in and it is up,
// no code change. Each file gets a src, a date from its mtime and a readable
// alt from its name; optional metadata maps keyed by filename add the rest.
//
// Note that mtime dating does not survive a clone — pin `added` in a metadata
// map for anything whose place in the order matters.
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { toDateString } from './dates'

export const IMAGE_RE = /\.(jpg|jpeg|png|webp|gif|avif)$/i

/** "2.jpg" before "16.jpg" — the order a person would put files in, not the
 *  order a byte comparison would. */
export const byName: (a: string, b: string) => number = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
}).compare

/** 'hilma-af-klint-swan.jpg' → 'hilma af klint swan'. Only a fallback, so
 *  naming files in words is worth the keystrokes. */
export const altFromFilename = (file: string): string =>
  file.replace(IMAGE_RE, '').replace(/[-_]+/g, ' ').trim()

export interface DroppedImage {
  /** Bare filename — the key metadata maps are keyed by. */
  file: string
  /** Path under /public, ready for next/image. */
  src: string
  alt: string
  /** The file's mtime, as YYYY/MM/DD. */
  added: string
}

export interface ReadOptions {
  /** The folder `dir` is relative to. Defaults to `<cwd>/public`. */
  publicDir?: string
  /** 'newest' (the default) for a wall that grows at the top; 'oldest' for a
   *  series read from its first drawing, ties broken by filename. */
  order?: 'newest' | 'oldest'
}

const resolve = (dir: string, publicDir?: string) =>
  path.join(publicDir ?? path.join(process.cwd(), 'public'), dir)

/** `dir` is relative to /public. A missing folder is not an error — it just
 *  means nothing has been dropped in yet. */
export const readDroppedImages = (dir: string, options: ReadOptions = {}): DroppedImage[] => {
  const abs = resolve(dir, options.publicDir)
  const oldest = options.order === 'oldest'
  try {
    return readdirSync(abs, { withFileTypes: true })
      .filter(e => e.isFile() && IMAGE_RE.test(e.name))
      .map(e => ({ file: e.name, mtime: statSync(path.join(abs, e.name)).mtime.getTime() }))
      .sort((a, b) => (oldest ? a.mtime - b.mtime || byName(a.file, b.file) : b.mtime - a.mtime))
      .map(({ file, mtime }) => ({
        file,
        src: `/${dir}/${file}`,
        alt: altFromFilename(file),
        added: toDateString(mtime),
      }))
  } catch {
    return []
  }
}

/** Hang a metadata map off a folder of images. A stated `alt` or `added` wins
 *  over the one derived from the file; a file with no entry still shows. */
export const withMeta = <M extends { alt?: string; added?: string }>(
  images: DroppedImage[],
  meta: Record<string, M>,
): (Omit<M, 'alt' | 'added'> & { file: string; src: string; alt: string; added: string })[] =>
  images.map(img => {
    const m = meta[img.file] ?? ({} as M)
    return { ...m, file: img.file, src: img.src, alt: m.alt ?? img.alt, added: m.added ?? img.added }
  })

export interface ImageFolder {
  /** The subfolder's name — the key captions and panel orders are keyed by. */
  folder: string
  /** Every image in it, in reading order. */
  images: string[]
}

/** One subfolder per multi-image piece (a multi-panel comic, say). Images are
 *  read in filename order; `panelOrder` pins a folder whose files were named
 *  out of order — the files it lists first, in that order, then the rest. */
export const readImageFolders = (
  dir: string,
  options: { publicDir?: string; panelOrder?: Record<string, string[]> } = {},
): ImageFolder[] => {
  const abs = resolve(dir, options.publicDir)
  try {
    return readdirSync(abs, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(({ name: folder }) => {
        const files = readdirSync(path.join(abs, folder))
          .filter(f => IMAGE_RE.test(f))
          .sort(byName)
        const pinned = options.panelOrder?.[folder]
        const ordered = pinned
          ? [...pinned.filter(f => files.includes(f)), ...files.filter(f => !pinned.includes(f))]
          : files
        return { folder, images: ordered.map(f => `/${dir}/${folder}/${f}`) }
      })
  } catch {
    return []
  }
}
