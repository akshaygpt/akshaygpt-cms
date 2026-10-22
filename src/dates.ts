// Every date is a 'YYYY/MM/DD' string — or a shorter 'YYYY/MM' or 'YYYY' for
// work that is only known to the month or year. Lists sort by plain string
// compare, so keep the format consistent.

/** Stored with slashes, printed with dashes, shortest form first:
 *  '2026/07/03' → '2026-07-03', '2026/05' → '2026-05', '2025' → '2025'. */
export const formatDate = (date: string, yearOnly?: boolean): string =>
  yearOnly ? date.split('/')[0] : date.split('/').join('-')

/** '2026/07/03' → a Date, for anything that needs one (a sitemap's
 *  lastModified, say). */
export const parseDate = (date: string): Date => new Date(date.split('/').join('-'))

/** A timestamp → '2026/08/13', in local time — how a dropped file is dated by
 *  its mtime, so it sorts alongside every hand-written date. */
export const toDateString = (ms: number): string => {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

/** Newest first. Undated items sink to the bottom. */
export const byDateDesc = <T extends { date?: string }>(a: T, b: T): number =>
  (b.date ?? '').localeCompare(a.date ?? '')
