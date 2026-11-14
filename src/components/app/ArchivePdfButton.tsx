import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ArchivePdfButton({ path, label }: { path: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const urls = useRef<string[]>([]);
  useEffect(() => () => { urls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  async function openPdf() {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setLoading(true);
    try {
      // Fetch privately, then navigate only to an app-origin blob, not the storage host.
      const { data, error } = await supabase.storage.from("tests").download(path);
      if (error || !data) throw new Error("Couldn't load that PDF.");
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      if (tab && !tab.closed) tab.location.replace(url);
      else setReadyUrl(url);
    } catch {
      tab?.close();
      toast.error("Couldn't load that PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (readyUrl) return <Button asChild variant="outline" size="sm"><a href={readyUrl} target="_blank" rel="noopener noreferrer"><ExternalLink />{label}</a></Button>;
  return <Button variant="outline" size="sm" disabled={loading} onClick={openPdf}>{loading ? <Loader2 className="animate-spin" /> : <ExternalLink />}{label}</Button>;
}