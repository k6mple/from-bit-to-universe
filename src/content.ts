export interface ChapterCopy {
  id: string
  index: string
  label: string
  /** the one line that has to land */
  en: string
  zh: string
  lede: string
  /** section height in viewport-heights */
  vh: number
  align: 'center' | 'left' | 'right' | 'bottom-left' | 'top-left' | 'top-center' | 'panel' | 'hero'
  /** shape slot in the master field, for reference */
  shape: number
  size: 'xl' | 'lg' | 'md'
}

export const CHAPTERS: ChapterCopy[] = [
  {
    id: 'bit',
    index: '00',
    label: 'THE BIT',
    en: 'EVERYTHING BEGINS WITH A BIT.',
    zh: '万物始于一个比特。',
    lede: '',
    vh: 220,
    align: 'hero',
    shape: 1,
    size: 'xl',
  },
  {
    id: 'transistor',
    index: '01',
    label: 'THE TRANSISTOR',
    en: 'A SINGLE DECISION, REPEATED FOREVER.',
    zh: '一个决定，被重复了亿万次。',
    lede: 'A transistor answers one question — yes, or no — and answers it again before you finish this sentence.',
    vh: 210,
    align: 'bottom-left',
    shape: 2,
    size: 'lg',
  },
  {
    id: 'processor',
    index: '02',
    label: 'THE PROCESSOR',
    en: 'BILLIONS OF TRANSISTORS. ONE EXTRAORDINARY MACHINE.',
    zh: '数十亿个晶体管，一台非凡的机器。',
    lede: 'Not one of them knows what the whole is doing. Together they have never once been wrong about arithmetic.',
    vh: 220,
    align: 'left',
    shape: 3,
    size: 'md',
  },
  {
    id: 'network',
    index: '03',
    label: 'THE NETWORK',
    en: 'ALONE, A MACHINE KNOWS ONLY ITSELF.',
    zh: '孤立的机器，只认识它自己。',
    lede: 'Press any node and watch a message leave home.',
    vh: 220,
    align: 'right',
    shape: 4,
    size: 'lg',
  },
  {
    id: 'kernel',
    index: '04',
    label: 'THE OPERATING SYSTEM',
    en: 'ORDER, INVISIBLE AND ABSOLUTE.',
    zh: '秩序，无形而绝对。',
    // Spoken by the console instead of the page — the system explains itself.
    lede: '',
    vh: 300,
    align: 'panel',
    shape: 5,
    size: 'md',
  },
  {
    id: 'mind',
    index: '05',
    label: 'THE MIND',
    en: 'NOTHING HERE WAS WRITTEN. IT WAS LEARNED.',
    zh: '这里没有一行是写下的，全都是学来的。',
    lede: 'Say something to it. The shape will answer.',
    vh: 230,
    align: 'top-center',
    shape: 6,
    size: 'lg',
  },
  {
    id: 'cosmos',
    index: '06',
    label: 'THE COSMOS',
    en: 'WE TAUGHT SILICON TO THINK.',
    zh: '从一粒沙，到一个能够思考的世界。',
    lede: '',
    vh: 240,
    align: 'center',
    shape: 7,
    size: 'xl',
  },
]

export const NAV_HINT = 'SCROLL'
