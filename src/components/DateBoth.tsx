import { formatEt, formatG } from "@/lib/ethiopian";

/** One date in both calendars, Ethiopian first. */
export function DateBoth({ j, title, align = "left" }: { j: number; title?: string; align?: "left" | "right" }) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      {title && <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{title}</div>}
      <div className="font-semibold leading-snug">{formatEt(j)}</div>
      <div className="text-sm text-muted">{formatG(j)}</div>
    </div>
  );
}
