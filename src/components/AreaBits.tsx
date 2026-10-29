"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { addArea, useAreas } from "@/lib/areas";

/** Small coloured label: "💼 Business · Coffee shop". */
export function AreaTag({ id, short = false }: { id?: string; short?: boolean }) {
  const areas = useAreas();
  const a = areas.info(id);
  if (!a) return null;
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-px font-semibold" style={{ color: a.color, background: `${a.color}1f` }}>
      <span aria-hidden>{a.emoji}</span>
      <span className="truncate">{short ? a.name : a.label}</span>
    </span>
  );
}

/** Compact dropdown with every area and its sub-groups. */
export function AreaSelect({
  value, onChange, id, className = "",
}: { value?: string; onChange: (id: string) => void; id: string; className?: string }) {
  const areas = useAreas();
  return (
    <select
      id={id}
      aria-label="Life area"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`min-w-0 rounded-full border border-line bg-surface px-3 py-1.5 text-sm ${className}`}
    >
      <option value="">No area</option>
      {areas.top.map((a) => (
        <optgroup key={a.id} label={`${a.emoji} ${a.name}`}>
          <option value={a.id}>{a.emoji} {a.name}</option>
          {areas.subs(a.id).map((s) => (
            <option key={s.id} value={s.id}>
              {"   "}↳ {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * Chips for choosing an area, then (for areas with sub-groups) which one.
 * New sub-groups can be added right here: "+ Add a business".
 */
export function AreaPicker({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const areas = useAreas();
  const top = areas.topOf(value);
  const topArea = top ? areas.byId.get(top) : undefined;
  const subs = top ? areas.subs(top) : [];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const chip = (on: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
      on ? "text-white" : "border-line text-muted hover:border-muted"
    }`;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Life area">
        {areas.top.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={top === a.id}
            title={a.hint}
            onClick={() => {
              onChange(top === a.id ? "" : a.id);
              setAdding(false);
            }}
            className={chip(top === a.id)}
            style={top === a.id ? { background: a.color, borderColor: a.color } : undefined}
          >
            <span aria-hidden>{a.emoji}</span> {a.name}
          </button>
        ))}
      </div>
      {topArea && (
        <div className="grid gap-2 rounded-2xl bg-surface-2 p-3">
          {topArea.hint && <p className="text-xs text-muted">{topArea.hint}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            {subs.length > 0 && (
              <button type="button" onClick={() => onChange(topArea.id)} className={chip(value === topArea.id)} style={value === topArea.id ? { background: topArea.color, borderColor: topArea.color } : undefined}>
                All of {topArea.name}
              </button>
            )}
            {subs.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={value === s.id}
                onClick={() => onChange(s.id)}
                className={chip(value === s.id)}
                style={value === s.id ? { background: topArea.color, borderColor: topArea.color } : undefined}
              >
                {s.name}
              </button>
            ))}
            {adding ? (
              <span className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (name.trim()) {
                        onChange(addArea({ name: name.trim(), parent: topArea.id }).id);
                        setName("");
                        setAdding(false);
                      }
                    }
                  }}
                  placeholder={`Name of the ${topArea.sub ?? "group"}`}
                  className="w-44 rounded-full border border-line bg-surface px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={() => {
                    onChange(addArea({ name: name.trim(), parent: topArea.id }).id);
                    setName("");
                    setAdding(false);
                  }}
                  className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-bg disabled:opacity-40"
                >
                  Add
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm font-semibold text-muted hover:text-ink"
              >
                <Plus size={14} /> Add {topArea.sub ? `a ${topArea.sub}` : "a sub-group"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
