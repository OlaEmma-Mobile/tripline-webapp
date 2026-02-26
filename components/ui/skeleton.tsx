'use client';

interface SkeletonProps {
  className?: string;
}

/**
 * Lightweight skeleton placeholder used for loading states.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-muted/60 ${className}`.trim()} />;
}
