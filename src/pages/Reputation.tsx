import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface ReputationSnapshotRecord {
  id: string
  snapshot_date: string
  average_rating: number | string
  review_count: number
}

interface ReviewRecord {
  id: string
  review_source_id: string
  rating: number | string
  title: string | null
  body: string | null
  reviewed_at: string
}

interface ReviewSourceRecord {
  id: string
  name: string
}

interface ReputationCounts {
  totalReviews: number
  negativeReviews: number
}

function getRatingValue(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

function getGlobalScore(
  snapshots: ReputationSnapshotRecord[],
  reviews: ReviewRecord[],
) {
  if (snapshots.length > 0) {
    return getRatingValue(snapshots[0].average_rating)
  }

  if (reviews.length === 0) {
    return 0
  }

  const totalRating = reviews.reduce(
    (sum, review) => sum + getRatingValue(review.rating),
    0,
  )

  return totalRating / reviews.length
}

function isNegativeReview(review: ReviewRecord) {
  return getRatingValue(review.rating) <= 3
}

function getTrend(
  snapshots: ReputationSnapshotRecord[],
  reviews: ReviewRecord[],
) {
  if (snapshots.length >= 2) {
    return (
      getRatingValue(snapshots[0].average_rating) -
      getRatingValue(snapshots[1].average_rating)
    )
  }

  if (reviews.length >= 2) {
    const midpoint = Math.ceil(reviews.length / 2)
    const recentReviews = reviews.slice(0, midpoint)
    const previousReviews = reviews.slice(midpoint)

    if (previousReviews.length === 0) {
      return 0
    }

    const recentAverage =
      recentReviews.reduce((sum, review) => sum + getRatingValue(review.rating), 0) /
      recentReviews.length
    const previousAverage =
      previousReviews.reduce((sum, review) => sum + getRatingValue(review.rating), 0) /
      previousReviews.length

    return recentAverage - previousAverage
  }

  return 0
}

function formatReviewedAt(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getReviewComment(review: ReviewRecord) {
  return review.body ?? review.title ?? 'No written comment'
}

interface ReputationKpiCardProps {
  label: string
  value: string
  helper: string
}

function ReputationKpiCard({ label, value, helper }: ReputationKpiCardProps) {
  return (
    <div className="surface-panel p-6">
      <div className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {value}
        </p>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-sm leading-6 text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  )
}

export function Reputation() {
  const [searchParams] = useSearchParams()
  const [snapshots, setSnapshots] = useState<ReputationSnapshotRecord[]>([])
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [reviewSourceMap, setReviewSourceMap] = useState<Map<string, string>>(new Map())
  const [counts, setCounts] = useState<ReputationCounts>({
    totalReviews: 0,
    negativeReviews: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadReputation() {
      if (!isSupabaseConfigured || !supabase) {
        if (!isCancelled) {
          setErrorMessage(
            'Supabase env missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load live guest feedback data.',
          )
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          if (!isCancelled) {
            setErrorMessage('Sign in to view live reputation monitoring.')
            setIsLoading(false)
          }
          return
        }

        const [
          { data: snapshotRows, error: snapshotsError },
          { data: reviewRows, error: reviewsError },
          { data: sourceRows, error: sourcesError },
          { count: totalReviewsCount, error: totalReviewsError },
          { count: negativeReviewsCount, error: negativeReviewsError },
        ] = await Promise.all([
          supabase
            .from('reputation_snapshots')
            .select('id, snapshot_date, average_rating, review_count')
            .is('review_source_id', null)
            .order('snapshot_date', { ascending: false })
            .limit(2),
          supabase
            .from('reviews')
            .select('id, review_source_id, rating, title, body, reviewed_at')
            .order('reviewed_at', { ascending: false })
            .limit(8),
          supabase.from('review_sources').select('id, name'),
          supabase.from('reviews').select('id', { count: 'exact', head: true }),
          supabase
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .lte('rating', 3),
        ])

        if (snapshotsError) {
          throw snapshotsError
        }

        if (reviewsError) {
          throw reviewsError
        }

        if (sourcesError) {
          throw sourcesError
        }

        if (totalReviewsError) {
          throw totalReviewsError
        }

        if (negativeReviewsError) {
          throw negativeReviewsError
        }

        if (!isCancelled) {
          setSnapshots((snapshotRows as ReputationSnapshotRecord[] | null) ?? [])
          setReviews((reviewRows as ReviewRecord[] | null) ?? [])
          setReviewSourceMap(
            new Map(
              ((sourceRows as ReviewSourceRecord[] | null) ?? []).map((source) => [
                source.id,
                source.name,
              ]),
            ),
          )
          setCounts({
            totalReviews: totalReviewsCount ?? 0,
            negativeReviews: negativeReviewsCount ?? 0,
          })
        }
      } catch (error) {
        console.error('Unable to load reputation monitoring', error)

        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load reputation monitoring right now.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadReputation()

    return () => {
      isCancelled = true
    }
  }, [])

  const globalScore = getGlobalScore(snapshots, reviews)
  const trend = getTrend(snapshots, reviews)
  const negativeOnly = searchParams.get('filter') === 'negative'
  const searchQuery = searchParams.get('q')?.trim().toLowerCase() ?? ''
  const filteredReviews = reviews.filter((review) => {
    if (negativeOnly && !isNegativeReview(review)) {
      return false
    }

    if (!searchQuery) {
      return true
    }

    return getReviewComment(review).toLowerCase().includes(searchQuery)
  })

  return (
    <PageSection
      title="Reputation"
      description="Live quality monitoring for guest feedback, score movement, and reviews requiring operational follow-up."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <ReputationKpiCard
          label="Global score"
          value={isLoading ? '...' : `${globalScore.toFixed(1)}/5`}
          helper="Latest overall guest satisfaction score."
        />
        <ReputationKpiCard
          label="Total reviews"
          value={isLoading ? '...' : String(counts.totalReviews)}
          helper="Published guest reviews across tracked sources."
        />
        <ReputationKpiCard
          label="Negative reviews"
          value={isLoading ? '...' : String(counts.negativeReviews)}
          helper="Reviews currently needing closer attention."
        />
      </div>

      {!isLoading &&
      !errorMessage &&
      (counts.negativeReviews > 0 || trend < 0) ? (
        <SurfaceCard
          title="Quality alerts"
          description="Signals that may affect guest satisfaction and public perception."
        >
          <div className="space-y-2">
            {counts.negativeReviews > 0 ? (
              <p className="text-sm font-medium text-amber-700">
                ⚠️ {counts.negativeReviews} negative{' '}
                {counts.negativeReviews > 1 ? 'reviews need' : 'review needs'} attention
              </p>
            ) : null}

            {trend < 0 ? (
              <p className="text-sm font-medium text-amber-700">
                ⚠️ Global score is down {Math.abs(trend).toFixed(1)} points versus the previous snapshot
              </p>
            ) : null}
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard
        title="Recent feedback"
        description="Latest published reviews with platform context and fast attention flags."
      >
        {isLoading ? (
          <p className="text-sm leading-7 text-slate-600">Loading guest feedback...</p>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="text-sm leading-7 text-slate-600">{errorMessage}</p>
        ) : null}

        {!isLoading && !errorMessage && reviews.length === 0 ? (
          <p className="text-sm leading-7 text-slate-600">No recent guest feedback</p>
        ) : null}

        {!isLoading && !errorMessage && reviews.length > 0 && filteredReviews.length === 0 ? (
          <p className="text-sm leading-7 text-slate-600">No reviews match this view</p>
        ) : null}

        {!isLoading && !errorMessage && filteredReviews.length > 0 ? (
          <div className="space-y-3">
            {filteredReviews.map((review) => {
              const negative = isNegativeReview(review)
              const platform = reviewSourceMap.get(review.review_source_id) ?? 'Direct'

              return (
                <div
                  key={review.id}
                  className={[
                    'rounded-3xl border p-5 transition-colors',
                    negative
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-slate-200 bg-white/80',
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {platform}
                          </span>
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {getRatingValue(review.rating).toFixed(1)}/5
                          </span>
                        </div>

                        <p className="text-sm leading-7 text-slate-700">
                          {getReviewComment(review)}
                        </p>
                      </div>

                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {formatReviewedAt(review.reviewed_at)}
                      </p>
                    </div>

                    {negative ? (
                      <div className="text-sm font-medium text-amber-700">
                        Needs attention
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </SurfaceCard>
    </PageSection>
  )
}
