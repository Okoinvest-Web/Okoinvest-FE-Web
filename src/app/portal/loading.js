export default function PortalLaedt() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">Wird geladen …</span>
      <div className="h-9 w-64 animate-pulse rounded-xl bg-ink-200/60" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-white ring-1 ring-ink-200/70" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-white ring-1 ring-ink-200/70" />
    </div>
  );
}
