const segmenter = new Intl.Segmenter('cn', { granularity: 'word' })

export function splitSegments(text: string) {
  return Array.from(segmenter.segment(text), item => item.segment)
}

const escaper = document.createElement('div')

export function escapeHTML(text: string) {
  escaper.textContent = text
  return escaper.innerHTML
}
