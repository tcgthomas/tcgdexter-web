"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cardImageSmall } from "@/lib/cardImages";
import type { CardIndexEntry } from "@/lib/cardsIndex";
import type { SortKey, SortDir } from "@/lib/cardSearch";
import CardImage from "./CardImage";
import CardFooterOverlay from "./CardFooterOverlay";

interface Facets {
  supertypes: string[];
  types: string[];
  subtypes: string[];
  regulations: string[];
  sets: Array<{ id: string; name: string; ptcgoCode: string | null }>;
}

interface Params {
  q: string;
  supertype: string[];
  type: string[];
  subtype: string[];
  regulation: string[];
  setId: string[];
  hpMin?: number;
  hpMax?: number;
  priceMin?: number;
  priceMax?: number;
  sort: SortKey;
  dir: SortDir;
  page: number;
  pageSize: number;
  view: "grid" | "list";
}

interface Props {
  initialResult: { cards: CardIndexEntry[]; total: number; page: number; pageSize: number };
  facets: Facets;
  initialParams: Params;
}

function buildUrl(pathname: string, params: Params): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.supertype.length) sp.set("supertype", params.supertype.join(","));
  if (params.type.length) sp.set("type", params.type.join(","));
  if (params.subtype.length) sp.set("subtype", params.subtype.join(","));
  if (params.regulation.length) sp.set("regulation", params.regulation.join(","));
  if (params.setId.length) sp.set("setId", params.setId.join(","));
  if (params.hpMin != null) sp.set("hpMin", String(params.hpMin));
  if (params.hpMax != null) sp.set("hpMax", String(params.hpMax));
  if (params.priceMin != null) sp.set("priceMin", String(params.priceMin));
  if (params.priceMax != null) sp.set("priceMax", String(params.priceMax));
  const defaultDir = params.sort === "name" || params.sort === "number" ? "asc" : "desc";
  if (params.sort !== "released") sp.set("sort", params.sort);
  if (params.dir !== defaultDir) sp.set("dir", params.dir);
  if (params.page !== 1) sp.set("page", String(params.page));
  if (params.pageSize !== 120) sp.set("pageSize", String(params.pageSize));
  if (params.view !== "grid") sp.set("view", params.view);
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export default function CardsClient({ initialResult, facets, initialParams }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [params, setParams] = useState<Params>(initialParams);
  const [searchInput, setSearchInput] = useState(initialParams.q);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSync = useRef(true);

  // Push to URL when params change (debounced for `q`).
  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false;
      return;
    }
    const url = buildUrl(pathname, params);
    startTransition(() => router.replace(url, { scroll: false }));
  }, [params, pathname, router]);

  // Re-derive params if URL changes externally (e.g. back/forward).
  useEffect(() => {
    setSearchInput(params.q);
  }, [params.q]);

  const updateParams = (patch: Partial<Params>) => {
    setParams((p) => ({ ...p, page: 1, ...patch }));
  };

  const toggleArrayValue = (key: keyof Params, value: string) => {
    setParams((p) => {
      const cur = (p[key] as string[]) ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...p, [key]: next, page: 1 };
    });
  };

  const handleSearchInput = (v: string) => {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ q: v }), 250);
  };

  const totalPages = Math.max(1, Math.ceil(initialResult.total / params.pageSize));

  const activeFilterCount =
    params.supertype.length +
    params.type.length +
    params.subtype.length +
    params.regulation.length +
    params.setId.length +
    (params.hpMin != null ? 1 : 0) +
    (params.hpMax != null ? 1 : 0) +
    (params.priceMin != null ? 1 : 0) +
    (params.priceMax != null ? 1 : 0);

  const clearFilters = () => {
    setParams((p) => ({
      ...p,
      supertype: [],
      type: [],
      subtype: [],
      regulation: [],
      setId: [],
      hpMin: undefined,
      hpMax: undefined,
      priceMin: undefined,
      priceMax: undefined,
      page: 1,
    }));
  };

  return (
    <main className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-text-primary">
          Cards
          <span className="ml-2 text-base font-normal text-text-muted">
            ({initialResult.total.toLocaleString()})
          </span>
        </h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder='Search cards — e.g. "bul 001", "charizard", "svi"'
            className="w-full px-4 py-2 rounded-full border border-black/10 bg-white text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 bg-white hover:bg-surface transition-colors"
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <select
            value={`${params.sort}:${params.dir}`}
            onChange={(e) => {
              const [s, d] = e.target.value.split(":") as [SortKey, SortDir];
              updateParams({ sort: s, dir: d });
            }}
            className="text-xs font-semibold h-[30px] px-3 rounded-full border border-black/10 bg-white"
          >
            <option value="released:desc">Newest sets first</option>
            <option value="released:asc">Oldest sets first</option>
            <option value="name:asc">Name A–Z</option>
            <option value="name:desc">Name Z–A</option>
            <option value="number:asc">Number ↑</option>
            <option value="number:desc">Number ↓</option>
            <option value="hp:desc">HP ↓</option>
            <option value="hp:asc">HP ↑</option>
            <option value="price:desc">Price ↓</option>
            <option value="price:asc">Price ↑</option>
            <option value="rarity:desc">Rarity ↓</option>
            <option value="rarity:asc">Rarity ↑</option>
          </select>
          <div className="inline-flex rounded-full border border-black/10 bg-white overflow-hidden">
            <button
              onClick={() => updateParams({ view: "grid" })}
              className={`text-xs font-semibold px-3 py-1.5 transition-colors ${
                params.view === "grid" ? "bg-black text-white" : "hover:bg-surface"
              }`}
              aria-label="Grid view"
            >
              Grid
            </button>
            <button
              onClick={() => updateParams({ view: "list" })}
              className={`text-xs font-semibold px-3 py-1.5 transition-colors ${
                params.view === "list" ? "bg-black text-white" : "hover:bg-surface"
              }`}
              aria-label="List view"
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-2xl border border-black/8 bg-white p-4 mb-4 space-y-4">
          <FacetGroup
            label="Supertype"
            options={facets.supertypes}
            selected={params.supertype}
            onToggle={(v) => toggleArrayValue("supertype", v)}
          />
          <FacetGroup
            label="Type"
            options={facets.types}
            selected={params.type}
            onToggle={(v) => toggleArrayValue("type", v)}
          />
          <FacetGroup
            label="Subtype"
            options={facets.subtypes}
            selected={params.subtype}
            onToggle={(v) => toggleArrayValue("subtype", v)}
          />
          <FacetGroup
            label="Regulation"
            options={facets.regulations}
            selected={params.regulation}
            onToggle={(v) => toggleArrayValue("regulation", v)}
          />
          <SetFacet
            sets={facets.sets}
            selected={params.setId}
            onToggle={(v) => toggleArrayValue("setId", v)}
          />
          <RangeFacet
            label="HP"
            min={params.hpMin}
            max={params.hpMax}
            onChange={(min, max) => updateParams({ hpMin: min, hpMax: max })}
          />
          <RangeFacet
            label="Price ($)"
            min={params.priceMin}
            max={params.priceMax}
            step={0.5}
            onChange={(min, max) => updateParams({ priceMin: min, priceMax: max })}
          />
          {activeFilterCount > 0 && (
            <div className="pt-2 border-t border-black/8">
              <button
                onClick={clearFilters}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 bg-white hover:bg-surface transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {initialResult.cards.length === 0 ? (
        <div className="rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-8 text-center">
          <p className="text-sm text-text-secondary">No cards match these filters.</p>
        </div>
      ) : params.view === "grid" ? (
        <GridView cards={initialResult.cards} />
      ) : (
        <ListView cards={initialResult.cards} />
      )}

      {/* Pagination */}
      {initialResult.total > params.pageSize && (
        <Pagination
          page={params.page}
          totalPages={totalPages}
          pageSize={params.pageSize}
          onPage={(p) => setParams((cur) => ({ ...cur, page: p }))}
          onPageSize={(ps) => updateParams({ pageSize: ps })}
        />
      )}
    </main>
  );
}

function FacetGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-text-secondary mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                on
                  ? "bg-black text-white border-transparent"
                  : "bg-white text-text-secondary border-black/10 hover:bg-surface"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SetFacet({
  sets,
  selected,
  onToggle,
}: {
  sets: Array<{ id: string; name: string; ptcgoCode: string | null }>;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return sets;
    return sets.filter(
      (s) => s.name.toLowerCase().includes(f) || s.ptcgoCode?.toLowerCase().includes(f)
    );
  }, [sets, filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-text-secondary">Set</div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter sets…"
          className="text-xs px-2 py-1 rounded-full border border-black/10 bg-white w-40"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
        {filtered.map((s) => {
          const on = selected.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => onToggle(s.id)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                on
                  ? "bg-black text-white border-transparent"
                  : "bg-white text-text-secondary border-black/10 hover:bg-surface"
              }`}
              title={s.id}
            >
              {s.name}
              {s.ptcgoCode ? ` (${s.ptcgoCode})` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeFacet({
  label,
  min,
  max,
  step = 10,
  onChange,
}: {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (min: number | undefined, max: number | undefined) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-secondary mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={min ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value), max)}
          placeholder="Min"
          className="text-xs px-2 py-1 rounded-full border border-black/10 bg-white w-24"
        />
        <span className="text-xs text-text-muted">to</span>
        <input
          type="number"
          step={step}
          value={max ?? ""}
          onChange={(e) => onChange(min, e.target.value === "" ? undefined : Number(e.target.value))}
          placeholder="Max"
          className="text-xs px-2 py-1 rounded-full border border-black/10 bg-white w-24"
        />
      </div>
    </div>
  );
}

function GridView({ cards }: { cards: CardIndexEntry[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Link
          key={c.id}
          href={`/cards/${encodeURIComponent(c.id)}`}
          className="group relative block rounded-xl overflow-hidden bg-surface hover:shadow-md transition-shadow"
          style={{ aspectRatio: "245 / 342" }}
        >
          <CardImage
            src={cardImageSmall(c.setId, c.number)}
            alt={`${c.name} — ${c.setName} ${c.number}`}
            name={c.name}
            setName={c.setName}
            number={c.number}
            className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
          />
          <CardFooterOverlay
            setCode={c.ptcgoCode}
            setId={c.setId}
            number={c.number}
            setSize={c.setSize}
            marketPrice={c.marketPrice}
          />
        </Link>
      ))}
    </div>
  );
}

function ListView({ cards }: { cards: CardIndexEntry[] }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white overflow-hidden">
      <div className="hidden md:grid grid-cols-[64px_2fr_1.5fr_80px_80px_80px_80px] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted border-b border-black/8">
        <span></span>
        <span>Name</span>
        <span>Set</span>
        <span>Number</span>
        <span>Type</span>
        <span>HP</span>
        <span className="text-right">Price</span>
      </div>
      <ul>
        {cards.map((c, i) => (
          <li key={c.id} className={i > 0 ? "border-t border-black/8" : ""}>
            <Link
              href={`/cards/${encodeURIComponent(c.id)}`}
              className="grid grid-cols-[48px_1fr] md:grid-cols-[64px_2fr_1.5fr_80px_80px_80px_80px] gap-3 px-4 py-2 items-center hover:bg-surface transition-colors"
            >
              <CardImage
                src={cardImageSmall(c.setId, c.number)}
                alt={`${c.name} — ${c.setName} ${c.number}`}
                name={c.name}
                setName={c.setName}
                number={c.number}
                className="w-12 h-[68px] md:w-14 md:h-[78px] object-cover rounded-md bg-surface text-[9px]"
              />
              <div className="md:contents">
                <span className="text-sm font-medium text-text-primary truncate">{c.name}</span>
                <span className="hidden md:inline text-sm text-text-secondary truncate">
                  {c.setName}
                  {c.ptcgoCode ? ` · ${c.ptcgoCode}` : ""}
                </span>
                <span className="hidden md:inline text-sm text-text-secondary">{c.number}</span>
                <span className="hidden md:inline text-sm text-text-secondary">
                  {c.types.join(", ") || c.supertype}
                </span>
                <span className="hidden md:inline text-sm text-text-secondary">{c.hp ?? "—"}</span>
                <span className="hidden md:inline text-sm text-text-secondary text-right">
                  {c.marketPrice > 0 ? `$${c.marketPrice.toFixed(2)}` : "—"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (ps: number) => void;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    <div className="mt-6 flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={!canPrev}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 bg-white disabled:opacity-40 hover:bg-surface transition-colors"
        >
          ← Prev
        </button>
        <span className="text-xs text-text-secondary">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={!canNext}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 bg-white disabled:opacity-40 hover:bg-surface transition-colors"
        >
          Next →
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <span>Per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="text-xs font-semibold h-[30px] px-3 rounded-full border border-black/10 bg-white"
        >
          <option value={60}>60</option>
          <option value={120}>120</option>
          <option value={240}>240</option>
        </select>
      </div>
    </div>
  );
}
