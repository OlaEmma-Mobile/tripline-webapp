import { Skeleton } from '@/components/ui/skeleton';

export default function PublicRouteCardSkeleton() {
  return (
    <div className="rounded-3xl border border-border/30 bg-card/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-7 w-48 rounded-xl" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-background/10 p-4">
        <div className="grid grid-cols-5 gap-2 space-x-2">
          <Skeleton className="h-3 col-span-2 rounded-full" />
          <Skeleton className="h-4 mx-auto w-10 rounded-full" />
          <Skeleton className="h-3 col-span-2 rounded-full" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>

      <Skeleton className="mt-5 h-16 rounded-2xl" />
    </div>
  );
}
