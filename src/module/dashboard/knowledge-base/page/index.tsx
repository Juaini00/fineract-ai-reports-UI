import { useMemo, useState } from "react";
import { BookOpen, FileText, Search, Sparkles } from "lucide-react";
import { Input } from "@/shared/components/ui/input";

const resources = [
  { title: "Getting started with AI reports", description: "A practical guide to asking focused questions and reading generated insights.", category: "Guides", source: "Product team", updated: "Today", featured: true },
  { title: "Portfolio health glossary", description: "Plain-language definitions for PAR, arrears, write-offs, and collection metrics.", category: "Reference", source: "Risk team", updated: "2 days ago", featured: true },
  { title: "Monthly review checklist", description: "A repeatable checklist for validating trends before sharing a report.", category: "Playbooks", source: "Operations", updated: "May 28", featured: true },
  { title: "Branch performance metrics", description: "How branch comparisons are calculated and when to use each measure.", category: "Reference", source: "Analytics", updated: "May 24", featured: false },
  { title: "Writing effective report prompts", description: "Examples of clear questions that produce concise, decision-ready answers.", category: "Guides", source: "Product team", updated: "May 20", featured: false },
  { title: "Data freshness and availability", description: "A quick reference for refresh timing and common reporting gaps.", category: "Policy", source: "Data team", updated: "May 16", featured: false },
];

const categories = ["All", ...new Set(resources.map((item) => item.category))];

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return resources.filter((item) =>
      (category === "All" || item.category === category) &&
      (!term || `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(term)),
    );
  }, [category, query]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <header className="rounded-2xl border bg-[var(--surface-brand)] p-5 shadow-[var(--shadow-panel)] sm:p-7">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-5" /></div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Knowledge base</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Answers for better reporting</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Browse practical guides, shared definitions, and review playbooks curated by your reporting teams.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="relative block">
            <span className="sr-only">Search resources</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-10 bg-background pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search guides and references" type="search" value={query} />
          </label>
          <label>
            <span className="sr-only">Filter by category</span>
            <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" onChange={(event) => setCategory(event.target.value)} value={category}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </header>

      <section aria-labelledby="overview-heading">
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-medium text-primary">At a glance</p><h2 className="text-lg font-semibold" id="overview-heading">Library overview</h2></div><p className="text-xs text-muted-foreground">{resources.length} curated resources</p></div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[{ label: "Categories", value: categories.length - 1, detail: "Guides, policy, and more" }, { label: "Contributors", value: new Set(resources.map((item) => item.source)).size, detail: "Across specialist teams" }, { label: "Recently updated", value: 3, detail: "In the last seven days" }].map((item) => (
            <article className="rounded-xl border bg-card p-4 shadow-[var(--shadow-panel)]" key={item.label}><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-semibold">{item.value}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></article>
          ))}
        </div>
      </section>

      {!query && category === "All" && <section aria-labelledby="featured-heading">
        <div className="mb-3 flex items-center gap-2"><Sparkles className="size-4 text-primary" /><h2 className="text-lg font-semibold" id="featured-heading">Featured resources</h2></div>
        <div className="grid gap-3 lg:grid-cols-3">{resources.filter((item) => item.featured).map((item) => <ResourceCard item={item} key={item.title} />)}</div>
      </section>}

      <section aria-labelledby="recent-heading">
        <div className="mb-3 flex items-end justify-between gap-3"><h2 className="text-lg font-semibold" id="recent-heading">{query || category !== "All" ? "Matching resources" : "Recent documents"}</h2><p aria-live="polite" className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "result" : "results"}</p></div>
        {filtered.length ? <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-panel)]">{filtered.map((item) => <article className="flex gap-3 border-b p-4 last:border-b-0" key={item.title}><div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"><FileText className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{item.title}</h3><span className="text-xs text-muted-foreground">{item.updated}</span></div><p className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p><p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">{item.category}</span> · {item.source}</p></div></article>)}</div> : <div className="rounded-xl border border-dashed bg-card p-8 text-center"><Search className="mx-auto size-5 text-muted-foreground" /><h3 className="mt-3 font-medium">No resources found</h3><p className="mt-1 text-sm text-muted-foreground">Try a broader search or choose another category.</p></div>}
      </section>
    </div>
  );
}

function ResourceCard({ item }: { item: (typeof resources)[number] }) {
  return <article className="rounded-xl border bg-card p-4 shadow-[var(--shadow-panel)]"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{item.category}</span><h3 className="mt-4 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-5 text-muted-foreground">{item.description}</p><p className="mt-4 text-xs text-muted-foreground">By {item.source}</p></article>;
}
