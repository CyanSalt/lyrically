export function parseTime(source) {
  const matches = source.match(/^(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/)
  if (!matches) return 0
  return Number(matches[1]) * 60 + Number(matches[2]) + Number(matches[3]) / 1000
}

export function parseLRC(source) {
  const rows = source.trim().split(/\n\s*/)
  return rows.map(row => {
    const matches = row.match(/^\s*\[(\d.*)\](.*)$/)
    if (!matches) return {time: 0, text: ''}
    const progress = matches[1].trim()
    const text = matches[2].trim()
    const time = parseTime(progress)
    return {time, text}
  }).sort((a, b) => a.time - b.time)
}
