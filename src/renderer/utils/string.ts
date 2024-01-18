const segmenter = new Intl.Segmenter([], { granularity: 'word' })

export function splitSegments(text: string) {
  return Array.from(segmenter.segment(text))
}

const escaper = document.createElement('div')

export function escapeHTML(text: string) {
  escaper.textContent = text
  return escaper.innerHTML
}
