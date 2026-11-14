import { useRef, useState } from "react";
import { Bold, List, Sigma, FlaskConical, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormattedExplanation } from "./FormattedExplanation";

export function ExplanationEditor({ id, value, onChange, label = "Explanation" }: { id: string; value: string; onChange: (value: string) => void; label?: string }) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  function insert(before: string, after: string, fallback: string) {
    const start = input.current?.selectionStart ?? value.length;
    const end = input.current?.selectionEnd ?? start;
    const selected = value.slice(start, end) || fallback;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    setPreview(false);
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(start + before.length, start + before.length + selected.length); });
  }
  return <div className="overflow-hidden rounded-md border border-input bg-card">
    <div className="flex flex-wrap items-center gap-1 border-b border-border p-1">
      <Button type="button" variant="ghost" size="icon" title="Bold" aria-label="Bold" onClick={() => insert("**", "**", "bold text")}><Bold /></Button>
      <Button type="button" variant="ghost" size="icon" title="Bulleted list" aria-label="Bulleted list" onClick={() => insert("\n\n- ", "\n", "list item")}><List /></Button>
      <Button type="button" variant="ghost" size="icon" title="Mathematical formula" aria-label="Mathematical formula" onClick={() => insert("$", "$", "\\frac{a}{b}")}><Sigma /></Button>
      <Button type="button" variant="ghost" size="icon" title="Chemical formula" aria-label="Chemical formula" onClick={() => insert("$\\ce{", "}$", "H2O")}><FlaskConical /></Button>
      <Button type="button" variant="ghost" size="icon" className="ml-auto" title={preview ? "Edit explanation" : "Preview explanation"} aria-label={preview ? "Edit explanation" : "Preview explanation"} onClick={() => setPreview(!preview)}>{preview ? <Pencil /> : <Eye />}</Button>
    </div>
    {preview ? <div className="min-h-32 p-3"><FormattedExplanation text={value} /></div> : <Textarea id={id} ref={input} aria-label={label} rows={6} value={value} onChange={(e) => onChange(e.target.value)} className="resize-y border-0 shadow-none focus-visible:ring-inset" />}
  </div>;
}