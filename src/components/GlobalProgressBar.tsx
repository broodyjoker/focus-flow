export function GlobalProgressBar({
  showGlobalProgress,
  globalProgress,
}: {
  showGlobalProgress: boolean;
  globalProgress: number;
}) {
  if (!showGlobalProgress) return null;

  return (
    <div className="fixed top-0 left-0 right-0 w-full h-1.5 z-[99999] overflow-hidden pointer-events-none">
      <div
        className={[
          'h-full',
          'transition-[width] duration-1000 ease-in-out shadow-[0_2px_10px_rgba(16,185,129,0.3)]',
          globalProgress === 100 ? 'animate-progress-pulse' : '',
        ].join(' ')}
        style={{
          width: `${globalProgress}%`,
          backgroundImage:
            'linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #10b981 65%, #10b981 100%)',
          backgroundSize: '100vw 100%',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  );
}
