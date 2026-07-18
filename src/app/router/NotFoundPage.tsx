import { Button } from "@/shared/components/ui/button";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-page)] p-4">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-panel)]" aria-labelledby="not-found-title">
        <div className="bg-[var(--surface-brand)] p-6 sm:p-8">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Compass className="size-5" /></div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Error 404</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl" id="not-found-title">This page is off the map</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">The address may be outdated or the page may have moved. Your dashboard and reports are still available.</p>
        </div>
        <div className="grid gap-3 p-6 min-[420px]:grid-cols-2 sm:p-8">
          <Button className="h-10" render={<Link to="/" />} size="lg"><Home />Dashboard</Button>
          <Button className="h-10" onClick={() => navigate(-1)} size="lg" variant="outline"><ArrowLeft />Go back</Button>
        </div>
      </section>
    </main>
  );
}
