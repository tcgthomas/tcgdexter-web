/**
 * Match Activity heat map — 60-day GitHub-style grid.
 *
 * Layout mirrors the card composition matrix (grid-cols-12, square cells,
 * rounded-[4px], no trainer-card borders). Colors use the gradient stops
 * from GradientButton (#F2A20C → #D91E0D → #A60D0D) mixed with opacity
 * to map match-count buckets to heat levels.
 */

type MatchRow = {
  played_at: string | null;
  created_at: string;
};

type Bucket = {
  key: string;        // YYYY-MM-DD local
  display: string;    // "Apr 12, 2026"
  count: number;
};

// Heat palette — uses the Sign-in-with-Email / trainer progress gradient stops.
function heatStyle(count: number): React.CSSProperties {
  if (count <= 0) return { backgroundColor: "var(--surface)" };
  if (count === 1) return { backgroundColor: "rgba(242,162,12,0.4)" };   // #F2A20C @ 40%
  if (count === 2) return { backgroundColor: "#F2A20C" };                // gradient start
  if (count === 3) return { backgroundColor: "#D91E0D" };                // gradient middle
  return { backgroundColor: "#A60D0D" };                                 // gradient end (4+)
}

const HEAT_LEVELS: { label: string; count: number }[] = [
  { label: "0", count: 0 },
  { label: "1", count: 1 },
  { label: "2", count: 2 },
  { label: "3", count: 3 },
  { label: "4+", count: 4 },
];

/** Build 60 day-buckets ending today, oldest → newest. */
function buildBuckets(matches: MatchRow[]): Bucket[] {
  const DAYS = 60;

  // Start today at local midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // en-CA yields YYYY-MM-DD in local time — stable key regardless of TZ offset
  const toKey = (d: Date) => d.toLocaleDateString("en-CA");
  const toDisplay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const buckets: Bucket[] = [];
  const index: Record<string, number> = {};

  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toKey(d);
    index[key] = buckets.length;
    buckets.push({ key, display: toDisplay(d), count: 0 });
  }

  for (const m of matches) {
    const ts = m.played_at ?? m.created_at;
    if (!ts) continue;
    const key = new Date(ts).toLocaleDateString("en-CA");
    const i = index[key];
    if (i !== undefined) buckets[i].count += 1;
  }

  return buckets;
}

export default function MatchHeatMap({ matches }: { matches: MatchRow[] }) {
  const buckets = buildBuckets(matches);
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="mt-6 rounded-2xl border border-black/8 bg-white/90 backdrop-blur-xl shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-text-primary">Match Activity</h2>
        <span className="text-xs text-text-muted">Last 60 days</span>
      </div>

      <div className="grid grid-cols-12 gap-1.5">
        {buckets.map((b) => (
          <div
            key={b.key}
            className="aspect-square rounded-[4px]"
            style={heatStyle(b.count)}
            title={`${b.count} match${b.count === 1 ? "" : "es"} on ${b.display}`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {total} match{total === 1 ? "" : "es"} in window
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">Less</span>
          {HEAT_LEVELS.map((lvl) => (
            <span
              key={lvl.label}
              className="w-3 h-3 rounded-[3px]"
              style={heatStyle(lvl.count)}
              title={`${lvl.label} match${lvl.count === 1 ? "" : "es"}`}
            />
          ))}
          <span className="text-xs text-text-muted">More</span>
        </div>
      </div>

      {total === 0 && (
        <p className="mt-3 text-xs text-text-muted">
          Log matches on your deck pages to build your activity map.
        </p>
      )}
    </div>
  );
}
