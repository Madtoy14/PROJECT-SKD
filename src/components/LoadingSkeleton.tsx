// Profile Page Skeleton
export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 md:p-8">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 md:w-32 md:h-32 bg-surface-subtle rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="h-8 bg-surface-subtle rounded w-48" />
          <div className="h-5 bg-surface-subtle rounded w-64" />
          <div className="h-4 bg-surface-subtle rounded w-32" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-surface-subtle rounded-2xl" />
        ))}
      </div>

      {/* Badge Section */}
      <div className="space-y-4">
        <div className="h-6 bg-surface-subtle rounded w-32" />
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-surface-subtle rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-surface-subtle rounded w-48" />
        <div className="h-4 bg-surface-subtle rounded w-64" />
      </div>

      {/* Energy Section */}
      <div className="h-32 bg-surface-subtle rounded-3xl" />

      {/* Streak Section */}
      <div className="h-40 bg-surface-subtle rounded-3xl" />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-surface-subtle rounded-2xl" />
        ))}
      </div>

      {/* Main CTA */}
      <div className="h-48 bg-surface-subtle rounded-3xl" />
    </div>
  );
}

// Shop Cards Skeleton
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="bg-surface border border-border p-5 md:p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 bg-surface-subtle rounded-2xl" />
              <div className="h-8 w-20 bg-surface-subtle rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-5 bg-surface-subtle rounded w-3/4" />
              <div className="h-4 bg-surface-subtle rounded w-full" />
              <div className="h-4 bg-surface-subtle rounded w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// List Skeleton (for Friends, Leaderboard)
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl">
            <div className="w-12 h-12 bg-surface-subtle rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-subtle rounded w-32" />
              <div className="h-3 bg-surface-subtle rounded w-48" />
            </div>
            <div className="h-8 w-16 bg-surface-subtle rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Quiz Question Skeleton
export function QuizSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 md:p-8">
      {/* Timer & Progress */}
      <div className="flex items-center justify-between">
        <div className="h-10 w-32 bg-surface-subtle rounded-xl" />
        <div className="h-10 w-24 bg-surface-subtle rounded-xl" />
      </div>

      {/* Question Number */}
      <div className="h-6 bg-surface-subtle rounded w-40" />

      {/* Question Text */}
      <div className="space-y-3">
        <div className="h-5 bg-surface-subtle rounded w-full" />
        <div className="h-5 bg-surface-subtle rounded w-5/6" />
        <div className="h-5 bg-surface-subtle rounded w-4/6" />
      </div>

      {/* Options */}
      <div className="space-y-3 mt-8">
        {['A', 'B', 'C', 'D', 'E'].map(option => (
          <div key={option} className="h-16 bg-surface-subtle rounded-2xl" />
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-8">
        <div className="h-12 flex-1 bg-surface-subtle rounded-xl" />
        <div className="h-12 flex-1 bg-surface-subtle rounded-xl" />
      </div>
    </div>
  );
}

// Result Page Skeleton
export function ResultSkeleton() {
  return (
    <div className="animate-pulse min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Badge */}
        <div className="h-10 w-48 bg-surface-subtle rounded-full mx-auto" />

        {/* Score Circle */}
        <div className="w-48 h-48 bg-surface-subtle rounded-full mx-auto" />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-surface-subtle rounded-3xl" />
          ))}
        </div>

        {/* Rewards */}
        <div className="h-24 bg-surface-subtle rounded-3xl" />

        {/* Buttons */}
        <div className="space-y-3">
          <div className="h-14 bg-surface-subtle rounded-2xl" />
          <div className="h-14 bg-surface-subtle rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// Generic Content Skeleton
export function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-6 bg-surface-subtle rounded w-3/4" />
      <div className="h-4 bg-surface-subtle rounded w-full" />
      <div className="h-4 bg-surface-subtle rounded w-5/6" />
      <div className="h-4 bg-surface-subtle rounded w-4/6" />
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-surface-subtle rounded flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 p-4">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={colIdx} className="h-4 bg-surface-subtle rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
