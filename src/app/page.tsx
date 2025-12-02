import { Suspense } from 'react'
import { Dashboard } from '@/features/dashboard/components/Dashboard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={<LoadingSpinner />}>
        <Dashboard />
      </Suspense>
    </main>
  )
}
