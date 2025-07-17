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
    let lastIndex = 0
    return Array.from(text.matchAll(/\S+/g)).flatMap(matched => {
      let data: SegmentData[] = []
      if (matched.index > lastIndex) {
        data.push({
          segment: matched.input.slice(lastIndex, matched.index),
          weight: 0,
        })
      }
      lastIndex = matched.index + matched[0].length
      data = data.concat(
        (segmentit.doSegment(matched[0]) as { w: string, p: number }[]).map<SegmentData>(item => {
          return {
            segment: item.w,
            weight: item.p === POSTAG.D_X ? 0 : (
              item.p === POSTAG.A_NR ? 0.5 : 1
            ),
          }
        }),
      )
      return data
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
