export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-24 animate-pulse bg-line/10" />
      <div className="mt-4 h-10 w-64 animate-pulse bg-line/10" />
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-36 animate-pulse border border-line/10 bg-void/30" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-52 animate-pulse border border-line/10 bg-void/30" />
        <div className="h-52 animate-pulse border border-line/10 bg-void/30" />
      </div>
    </div>
  );
}
