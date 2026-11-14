import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { DEFAULT_DIVISION } from "@/lib/practice-scope";
import { schoolYear } from "@/lib/school-year";

export function TestArchive() {
  const { data: me } = useMe();
  const [event, setEvent] = useState("all");
  const [division, setDivision] = useState<string>(DEFAULT_DIVISION);
  const [year, setYear] = useState("all");
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [tab, setTab] = useState("tests");
  const { data: tests = [], isLoading, error } = useQuery({
    queryKey: ["archive"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tests").select("id,event,division,year,tournament,level,source_path,key_path,question_count,created_by").eq("status", "parsed").order("year", { ascending: false }).order("event");
      if (error) throw error;
      return data ?? [];
    },
  });
  const paths = tests.flatMap((test) => [test.source_path, test.key_path]).filter((path): path is string => !!path);
  const { data: pdfLinks = {}, error: linkError } = useQuery({
    queryKey: ["archive-pdf-links", paths],
    enabled: paths.length > 0,
    staleTime: 240_000,
    refetchInterval: 240_000,
    refetchOnWindowFocus: "always",
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("tests").createSignedUrls(paths, 600);
      if (error) throw error;
      return Object.fromEntries((data ?? []).filter((item) => item.path && item.signedUrl && !item.error).map((item) => [item.path, item.signedUrl])) as Record<string, string>;
    },
  });
  const events = [...new Set(tests.map((t) => t.event))].sort();
  const years = [...new Set(tests.map((t) => String(t.year)).filter((y) => y !== "null"))].sort().reverse();
  const levels = [...new Set(tests.map((t) => t.level).filter((l): l is string => !!l))].sort();
  const rows = tests.filter((t) => (event === "all" || t.event === event) && (division === "all" || t.division === division) && (year === "all" || String(t.year) === year) && (level === "all" || t.level === level) && (!mine || t.created_by === me?.id) && `${t.event} ${t.tournament ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <h1 className="text-3xl font-extrabold">Test Archive</h1>
    <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="tests"><FileText className="mr-2 h-4 w-4" />Past tests ({tests.length})</TabsTrigger><TabsTrigger value="pdf">PDF archive</TabsTrigger></TabsList></Tabs>
    <section className="panel space-y-4 p-5">
      <div className="space-y-2"><Label>Event</Label><Select value={event} onValueChange={setEvent}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All events</SelectItem>{events.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_2fr_auto]">
        <div className="space-y-2"><Label>Division</Label><div className="flex gap-1">{["all", "B", "C"].map((d) => <Button key={d} variant={division === d ? "default" : "outline"} size="sm" onClick={() => setDivision(d)}>{d === "all" ? "All" : d}</Button>)}</div></div>
        <div className="space-y-2"><Label>School year</Label><Select value={year} onValueChange={setYear}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All school years</SelectItem>{years.map((y) => <SelectItem key={y} value={y}>{schoolYear(y)}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Level</Label><Select value={level} onValueChange={setLevel}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All levels</SelectItem>{levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="archive-search">Search</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="archive-search" className="pl-9" placeholder="Tournament or title…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
        <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />My tests</label>
      </div>
    </section>
    {isLoading && <p className="text-muted-foreground">Loading tests…</p>}
    {error && <p className="text-destructive">Couldn't load the archive.</p>}
    {linkError && <p className="text-destructive">Couldn't load PDF links. Please refresh and try again.</p>}
    <div className="space-y-3">{rows.map((t) => <article key={t.id} className="panel flex flex-wrap items-center gap-4 p-4">
      <FileText className="h-6 w-6 text-primary" />
      <div className="min-w-0 flex-1 basis-60"><h2 className="font-bold">{t.event}</h2><p className="text-sm text-muted-foreground">{t.tournament ?? "Past tournament"} · {schoolYear(t.year) || "Year unknown"}{t.division ? ` · Div ${t.division}` : ""}{t.level ? ` · ${t.level}` : ""}</p>{tab === "tests" && <span className="text-xs text-muted-foreground">{t.question_count} questions</span>}</div>
      <div className="flex flex-wrap gap-2">{t.source_path && (pdfLinks[t.source_path] ? <Button asChild variant="outline" size="sm"><a href={pdfLinks[t.source_path]} target="_blank" rel="noopener noreferrer"><ExternalLink />Test PDF</a></Button> : <Button variant="outline" size="sm" disabled>Test PDF</Button>)}{t.key_path ? (pdfLinks[t.key_path] ? <Button asChild variant="outline" size="sm"><a href={pdfLinks[t.key_path]} target="_blank" rel="noopener noreferrer"><ExternalLink />Answer key</a></Button> : <Button variant="outline" size="sm" disabled>Answer key</Button>) : <span className="self-center text-xs text-muted-foreground">No answer key</span>}</div>
    </article>)}</div>
    {!isLoading && !error && !rows.length && <p className="py-6 text-center text-muted-foreground">No tests match these filters.</p>}
  </div>;
}