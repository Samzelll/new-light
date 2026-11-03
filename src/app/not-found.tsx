import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-bg text-ink font-sans">
      <h2 className="text-4xl font-bold font-display mb-3 text-accent">404</h2>
      <p className="text-muted mb-6 text-sm max-w-sm">Страница не найдена или ссылка устарела.</p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full bg-accent-solid hover:bg-accent-hover text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-md"
      >
        Вернуться на главную
      </Link>
    </div>
  );
}
