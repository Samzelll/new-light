import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#0b0b0d] text-white">
      <h2 className="text-4xl font-bold font-display mb-3 text-violet-400">404</h2>
      <p className="text-zinc-400 mb-6 text-sm max-w-sm">Page not found or the link might be expired.</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
