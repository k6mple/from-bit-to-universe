import { Content } from './content'

/**
 * The tutorial page: one centred column of type on near-black.
 *
 * No navbar, no sidebar, no footer — nothing competes with the text. The
 * column is capped at 832px including its padding, which leaves a ~784px
 * measure on a desktop and 20px gutters on a phone.
 *
 * All body copy lives in content.tsx; this file only holds the frame.
 */
export default function TutorialApp() {
  return (
    <main className="tut">
      <article className="mx-auto w-full max-w-[832px] px-[clamp(20px,5vw,24px)] pt-[clamp(56px,10vh,104px)] pb-[clamp(72px,14vh,160px)]">
        <Content />
      </article>
    </main>
  )
}
