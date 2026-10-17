import { SearchResultsSkeleton } from '@/components/common/Skeletons';

export default function SearchLoading() {
  return (
    <main className="max-w-md mx-auto p-4 sm:p-5 pb-24 animate-pulse">
      {/* Search header skeleton */}
      <div className="flex items-center justify-between pb-3 mb-4">
        <div className="h-6 w-32 rounded bg-neutral-800" />
        <div className="w-9 h-9 rounded-xl bg-neutral-800" />
      </div>

      {/* Search input skeleton */}
      <div className="h-12 w-full rounded-2xl bg-neutral-900 border border-neutral-800 mb-6" />

      {/* Results skeleton */}
      <SearchResultsSkeleton count={5} />
    </main>
  );
}
