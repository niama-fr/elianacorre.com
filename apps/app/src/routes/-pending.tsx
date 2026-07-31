import { Skeleton } from "@ec/ui/components/skeleton";

export function RoutePendingPage() {
  return (
    <section aria-busy="true" aria-live="polite" className="flex flex-col gap-4" aria-label="Chargement de la page">
      <span className="sr-only">Chargement…</span>
      <Skeleton className="h-10 w-64 max-w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </section>
  );
}
