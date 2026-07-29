export default function GlobalLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface-900 text-white p-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      <div className="flex flex-col items-center space-y-6 relative z-10 text-center animate-fade-in">
        {/* Animated Brand Icon Logo */}
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-blue p-0.5 shadow-[0_0_30px_rgba(var(--brand-500-rgb),0.35)] animate-pulse">
            <div className="w-full h-full bg-surface-900 rounded-[14px] flex items-center justify-center">
              <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-blue">
                ON
              </span>
            </div>
          </div>
          {/* Outer spinning ring */}
          <div className="absolute -inset-2 border-2 border-dashed border-brand-500/30 rounded-3xl animate-spin [animation-duration:8s]" />
        </div>

        {/* Loading status & spinner */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-wide text-white">Opinion Net</h2>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-400">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            <span>Loading screen...</span>
          </div>
        </div>

        {/* Shimmer loading bar */}
        <div className="w-48 h-1.5 bg-surface-800 rounded-full overflow-hidden border border-surface-700/50">
          <div className="w-full h-full bg-gradient-to-r from-brand-500 via-accent-blue to-brand-500 animate-shimmer bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}
