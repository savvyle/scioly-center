import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

export type PracticeOption = { value: string; label: string; indent?: boolean; heading?: string };
export function PracticeMultiSelect({ label, placeholder, options, value, onChange, disabled = false }: { label: string; placeholder: string; options: PracticeOption[]; value: string[]; onChange: (values: string[]) => void; disabled?: boolean }) {
  const selected = options.filter((option) => value.includes(option.value));
  return <Popover><PopoverTrigger asChild><Button variant="outline" aria-label={label} disabled={disabled} className="h-auto min-h-10 w-full justify-between whitespace-normal text-left font-normal"><span className="min-w-0">{selected.length ? selected.map((option) => option.label).join(", ") : placeholder}</span><ChevronDown className="ml-2 h-4 w-4 shrink-0" /></Button></PopoverTrigger><PopoverContent align="start" className="max-h-96 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-2">
    {value.length > 0 && <Button variant="ghost" size="sm" className="mb-1 w-full justify-start" onClick={() => onChange([])}>Clear selection</Button>}
    {options.map((option, i) => <div key={option.value}>{option.heading && option.heading !== options[i - 1]?.heading && <p className="px-2 pb-1 pt-3 text-xs font-bold text-muted-foreground">{option.heading}</p>}<label className={`flex cursor-pointer items-start gap-2 rounded-sm py-2 pr-2 text-sm hover:bg-muted ${option.indent ? "pl-7" : "pl-2 font-semibold"}`}><Checkbox aria-label={option.label} checked={value.includes(option.value)} onCheckedChange={(checked) => onChange(checked ? [...value, option.value] : value.filter((item) => item !== option.value))} /><span className="min-w-0 break-words">{option.label}</span></label></div>)}
  </PopoverContent></Popover>;
}