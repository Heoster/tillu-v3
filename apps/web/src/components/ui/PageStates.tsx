/**
 * Global UI state components — UI spec §100.
 *
 * Every page supports: Loading | Empty | Error | Offline | Degraded | Processing
 * Never show a blank screen.
 */

// ── Loading ───────────────────────────────────────────────────────────────────

export function PageLoading({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" role="status" aria-live="polite">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" aria-hidden />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?:       string;
  title:       string;
  description: string;
  action?:     { label: string; href?: string; onClick?: () => void };
}

export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
      <p className="text-4xl" aria-hidden>{icon}</p>
      <p className="text-gray-300 font-medium">{title}</p>
      <p className="text-gray-500 text-sm max-w-sm">{description}</p>
      {action && (
        action.href ? (
          <a
            href={action.href}
            className="mt-2 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            {action.label} →
          </a>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-2 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            {action.label} →
          </button>
        )
      )}
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?:       string;
  message?:     string;
  onRetry?:     () => void;
  recoverable?: boolean;
}

export function ErrorState({
  title       = "Something went wrong",
  message     = "An unexpected error occurred. Please try again.",
  onRetry,
  recoverable = true,
}: ErrorStateProps) {
  return (
    <div className="card p-5 flex flex-col items-center text-center space-y-3">
      <p className="text-3xl" aria-hidden>{recoverable ? "🟡" : "🔴"}</p>
      <p className="text-gray-300 font-medium">{title}</p>
      <p className="text-gray-500 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ── Offline state ─────────────────────────────────────────────────────────────

export function OfflineState({ feature = "This feature" }: { feature?: string }) {
  return (
    <div className="card p-5 text-center space-y-2">
      <p className="text-3xl" aria-hidden>📡</p>
      <p className="text-gray-300 font-medium">{feature} is unavailable offline</p>
      <p className="text-gray-500 text-sm">
        Your study plan, revision, and cached quizzes are still available.
      </p>
    </div>
  );
}

// ── Degraded state ────────────────────────────────────────────────────────────

export function DegradedState({
  service   = "This service",
  fallback  = "Your core study system is still working.",
}: { service?: string; fallback?: string }) {
  return (
    <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-2xl p-4 flex items-start gap-3">
      <span className="text-yellow-400 shrink-0 mt-0.5" aria-hidden>🟡</span>
      <div>
        <p className="text-yellow-300 text-sm font-medium">{service} is temporarily limited</p>
        <p className="text-yellow-600 text-xs mt-0.5">{fallback}</p>
      </div>
    </div>
  );
}

// ── Processing state ──────────────────────────────────────────────────────────

interface ProcessingStep {
  label:     string;
  completed: boolean;
}

export function ProcessingState({
  title  = "Tillu is thinking…",
  steps,
}: { title?: string; steps?: ProcessingStep[] }) {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" aria-hidden />
        <p className="text-gray-300 text-sm font-medium">{title}</p>
      </div>
      {steps && steps.length > 0 && (
        <ul className="space-y-1.5 pl-6">
          {steps.map((step, i) => (
            <li key={i} className={`flex items-center gap-2 text-xs ${step.completed ? "text-green-400" : "text-gray-500"}`}>
              <span aria-hidden>{step.completed ? "✓" : "○"}</span>
              <span>{step.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gray-800 rounded-lg animate-pulse ${className}`}
      aria-hidden
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
