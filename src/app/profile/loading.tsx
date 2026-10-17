import { ProfilePageSkeleton } from '@/components/common/Skeletons';

export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white flex justify-center">
      <ProfilePageSkeleton />
    </main>
  );
}
