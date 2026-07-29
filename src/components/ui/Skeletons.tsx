"use client";

/**
 * Skeleton loader for a contest card on the main feed.
 * Matches the exact dimensions of the real card so there's no layout shift.
 */
export function ContestCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--color-surface-800)',
        border: '1px solid var(--color-surface-600)',
        borderRadius: '20px',
        padding: '22px',
        minHeight: '240px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Top badges row */}
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <div className="skeleton-shimmer" style={{ height: '22px', width: '64px', borderRadius: '6px' }} />
          <div className="skeleton-shimmer" style={{ height: '22px', width: '80px', borderRadius: '6px' }} />
        </div>

        {/* Title */}
        <div className="skeleton-shimmer" style={{ height: '22px', width: '75%', borderRadius: '8px', marginBottom: '8px' }} />
        <div className="skeleton-shimmer" style={{ height: '22px', width: '55%', borderRadius: '8px', marginBottom: '12px' }} />

        {/* Description */}
        <div className="skeleton-shimmer" style={{ height: '16px', width: '100%', borderRadius: '6px', marginBottom: '6px' }} />
        <div className="skeleton-shimmer" style={{ height: '16px', width: '80%', borderRadius: '6px' }} />
      </div>

      {/* Bottom row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          marginTop: '16px',
          borderTop: '1px solid var(--color-surface-700)',
        }}
      >
        <div className="skeleton-shimmer" style={{ height: '14px', width: '80px', borderRadius: '6px' }} />
        <div className="skeleton-shimmer" style={{ height: '14px', width: '60px', borderRadius: '6px' }} />
      </div>
    </div>
  );
}

/**
 * Full feed skeleton — shows N placeholder cards in the same grid layout.
 */
export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ContestCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for the battle view on contest page.
 */
export function BattleSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            background: 'var(--color-surface-800)',
            border: '1px solid var(--color-surface-600)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            className="skeleton-shimmer"
            style={{ width: '100%', aspectRatio: '1/1', maxWidth: '240px', borderRadius: '16px' }}
          />
          <div className="skeleton-shimmer" style={{ height: '20px', width: '60%', borderRadius: '8px' }} />
          <div className="skeleton-shimmer" style={{ height: '40px', width: '40%', borderRadius: '8px' }} />
          <div className="skeleton-shimmer" style={{ height: '44px', width: '100%', borderRadius: '14px' }} />
        </div>
      ))}
    </div>
  );
}
