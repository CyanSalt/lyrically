import { memoize, sum } from 'lodash-es'

const CHINESE_PATTERN = /\p{sc=Han}/gu

export function isChineseText(text: string) {
  if (!text.length) return false
  const matches = text.match(CHINESE_PATTERN)
  if (!matches) return false
  const length = sum(matches.map(part => part.length))
  return length / text.length > 0.25
}

export type Segmenter = (text: string) => Intl.SegmentData[]

export const getChineseSegmenter = memoize<() => Promise<Segmenter>>(async () => {
  const { POSTAG, Segment, useDefault } = await import('segmentit')
  const segmentit = useDefault(new Segment())
  return (text: string) => {
    let index = 0
    return (
      segmentit.doSegment(text) as { w: string, p: number }[]
    ).map<Intl.SegmentData>(item => {
      const currentIndex = index
      index += item.w.length
      return {
        segment: item.w,
        index: currentIndex,
        input: text,
        isWordLike: item.p !== POSTAG.D_X,
      }
    })
  }
})

const segmenter = new Intl.Segmenter([], { granularity: 'word' })

export const defaultSegmenter: Segmenter = (text: string) => {
  return Array.from(segmenter.segment(text))
}

const escaper = document.createElement('div')

export function escapeHTML(text: string) {
  escaper.textContent = text
  return escaper.innerHTML
}
