import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth'
import { BASKETBALL_IQ_QUESTIONS } from '@/lib/basketballIqData'
import { BasketballIqQuiz } from '@/components/athlete/BasketballIqQuiz'
import { PhotoHero } from '@/components/media/PhotoHero'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Basketball IQ | CMBA Connect' }

export default async function AthleteQuizPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/athlete/quiz')

  // Strip the answer key before it reaches the client; scoring is server-side.
  const questions = BASKETBALL_IQ_QUESTIONS.map(({ id, topic, question, options }) => ({ id, topic, question, options }))

  return (
    <div>
      <PhotoHero image="hoopNetSky" eyebrow="Athlete Hub · Basketball IQ" title="Basketball" accent="IQ"
        subtitle="Test what you know about CMBA rules. Pass the quiz to earn XP, learn the game, and play smarter." />
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        <BasketballIqQuiz quizId="basketball-iq" questions={questions} />
      </div>
    </div>
  )
}
