export function parseTime(source: string) {
  // eslint-disable-next-line unicorn/no-unsafe-regex
  const matches = source.match(/^(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/)
  if (!matches) return 0
  return Number(matches[1]) * 60 + Number(matches[2]) + Number(matches[3]) / 1000
}

export interface LyricRow {
  text: string,
  time: number,
}

export function parseLRC(source: string) {
  const rows = source.trim().split(/\r?\n\s*/)
  let offset = 0
  return rows.flatMap(row => {
    // eslint-disable-next-line unicorn/no-unsafe-regex
    const matches = row.match(/^(\s*\[.+\])+(.*)$/)
    if (!matches) return []
    const tags = matches[1].match(/\[.+?\]/g)!
    const text = matches[2].trim()
    return tags.reduce<LyricRow[]>((result, tag) => {
      tag = tag.slice(1, -1).trim()
      if (tag.startsWith('offset:')) {
        offset = Number(tag.slice('offset:'.length)) / 1000
      } else {
        const time = parseTime(tag) + offset
        result.push({ time, text })
      }
      return result
    }, [])
  }).sort((a, b) => a.time - b.time)
}
