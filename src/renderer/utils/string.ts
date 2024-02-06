import { memoize, sum } from 'lodash-es'

const CHINESE_PATTERN = /\p{sc=Han}/gu

export function isChineseText(text: string) {
  if (!text.length) return false
  const matches = text.match(CHINESE_PATTERN)
  if (!matches) return false
  const length = sum(matches.map(part => part.length))
  return length / text.length > 0.25
}

export interface SegmentData {
  segment: string,
  weight?: number,
}

export type Segmenter = (text: string) => SegmentData[]

export const getChineseSegmenter = memoize<() => Promise<Segmenter>>(async () => {
  const { POSTAG, Segment, useDefault } = await import('segmentit')
  const segmentit = useDefault(new Segment())
  return (text: string) => {
    return (segmentit.doSegment(text) as { w: string, p: number }[]).map<SegmentData>(item => {
      return {
        segment: item.w,
        weight: item.p === POSTAG.D_X ? 0 : (
          item.p === POSTAG.A_NR ? 0.5 : 1
        ),
      }
    })
  }
})

const segmenter = new Intl.Segmenter([], { granularity: 'word' })

export const defaultSegmenter: Segmenter = (text: string) => {
  return Array.from(segmenter.segment(text), item => {
    return {
      segment: item.segment,
      weight: item.isWordLike ? 1 : 0,
    }
  })
}

const escaper = document.createElement('div')

export function escapeHTML(text: string) {
  escaper.textContent = text
  return escaper.innerHTML
}
