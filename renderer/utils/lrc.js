export function parseTime(source) {
  const matches = source.match(/^(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/)
  if (!matches) return 0
  return Number(matches[1]) * 60 + Number(matches[2]) + Number(matches[3]) / 1000
}

export function parseLRC(source) {
  const rows = source.trim().split(/\r?\n\s*/)
  let offset = 0
  return rows.flatMap(row => {
    const matches = row.match(/^(\s*\[.+\])+(.*)$/)
    if (!matches) return []
    const tags = matches[1].match(/\[.+?\]/g)
    const text = matches[2].trim()
    return tags.reduce((result, tag) => {
      tag = tag.slice(1, -1).trim()
      if (tag.startsWith('offset:')) {
        offset = Number(tag.slice('offset:'.length)) / 1000
      } else {
        const time = parseTime(tag) + offset
        result.push({time, text})
      }
      return result
    }, [])
  }).sort((a, b) => a.time - b.time)
}
