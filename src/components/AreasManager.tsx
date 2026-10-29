"use client";

import { Eye, EyeOff, Plus, X } from "lucide-react";
import { useState } from "react";
import { addArea, areaStore, BUILT_IN, changeArea, COLORS, EMOJIS, hideArea, useAreas, type Area } from "@/lib/areas";
import { useStored } from "@/lib/storage";

/** Rename, hide, and add life areas and their sub-groups. */
export function AreasManager() {
  const areas = useAreas();
  const [saved] = useStored<Area[]>(areaStore.key, areaStore.NONE);
  const hidden = [...BUILT_IN, ...saved].filter(
    (a, i, all) => !a.parent && all.findIndex((x) => x.id === a.id) === i && areas.byId.get(a.id)?.deleted,
  );

  return (
    <div className="grid gap-5">
      <div className="pr-10">
        <h2 className="font-display text-2xl font-extrabold">Life areas</h2>
        <p className="text-sm text-muted">
          The parts of your life your tasks and money belong to. Rename them, hide the ones you don&apos;t need, add
          sub-groups (each business, each organization, each person), or create your own.
        </p>
      </div>

      <ul className="grid gap-3">
        {areas.top.map((a) => (
          <AreaRow key={a.id} a={a} subs={areas.subs(a.id)} />
        ))}
      </ul>

      <NewArea />

      {hidden.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Hidden</h3>
          <div className="flex flex-wrap gap-2">
            {hidden.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => changeArea(a.id, { deleted: false })}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:text-ink"
              >
                <Eye size={14} /> {a.emoji} {areas.byId.get(a.id)?.name ?? a.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AreaRow({ a, subs }: { a: Area; subs: Area[] }) {
  const [name, setName] = useState(a.name);
  const [adding, setAdding] = useState("");
  const commit = () => {
    const n = name.trim();
    if (n && n !== a.name) changeArea(a.id, { name: n });
    else setName(a.name);
  };
  return (
    <li className="grid gap-2 rounded-2xl border border-line p-3">
      <div className="flex items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${a.color}22` }}>
          {a.emoji}
        </span>
        <input
          aria-label={`Name of ${a.name}`}
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 font-semibold hover:bg-surface-2 focus:bg-surface-2"
        />
        <button
          type="button"
          onClick={() => hideArea(a.id)}
          aria-label={`Hide ${a.name}`}
          title="Hide (tasks keep their label)"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:text-marker"
        >
          <EyeOff size={16} />
        </button>
      </div>
      {a.hint && <p className="-mt-1 pl-11 text-xs text-muted">{a.hint}</p>}
      <div className="flex flex-wrap items-center gap-1.5 pl-11">
        {subs.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1 text-sm">
            {s.name}
            <button type="button" onClick={() => hideArea(s.id)} aria-label={`Remove ${s.name}`} className="grid size-5 place-items-center rounded-full text-muted hover:text-marker">
              <X size={12} />
            </button>
          </span>
        ))}
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!adding.trim()) return;
            addArea({ name: adding.trim(), parent: a.id });
            setAdding("");
          }}
        >
          <input
            aria-label={`Add to ${a.name}`}
            value={adding}
            maxLength={40}
            onChange={(e) => setAdding(e.target.value)}
            placeholder={`+ Add ${a.sub ? `a ${a.sub}` : "a sub-group"}`}
            className="w-44 rounded-full border border-dashed border-line bg-transparent px-3 py-1 text-sm"
          />
          {adding.trim() && (
            <button type="submit" className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-bg">Add</button>
          )}
        </form>
      </div>
    </li>
  );
}

function NewArea() {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[6]);
  return (
    <form
      className="grid gap-3 rounded-2xl bg-surface-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        addArea({ name: name.trim(), emoji, color });
        setName("");
      }}
    >
      <h3 className="font-semibold">Create your own area</h3>
      <input
        id="new-area-name"
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Church choir, Master's degree, Farm"
        className="min-w-0 rounded-xl border border-line bg-surface px-3 py-2 text-[15px]"
      />
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Icon">
        {EMOJIS.map((x) => (
          <button
            key={x}
            type="button"
            role="radio"
            aria-checked={emoji === x}
            onClick={() => setEmoji(x)}
            className={`grid size-9 place-items-center rounded-lg text-lg ${emoji === x ? "bg-surface ring-2 ring-green" : ""}`}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={`size-7 rounded-full ${color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-surface-2" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <button
        type="submit"
        disabled={!name.trim()}
        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green px-4 py-2 text-sm font-semibold text-on-green disabled:opacity-40"
      >
        <Plus size={16} /> Add area
      </button>
    </form>
  );
}
