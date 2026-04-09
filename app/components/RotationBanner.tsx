import StandardFormatInfo from "./StandardFormatInfo";

interface Props {
  rotatingCards: Array<{ name: string; qty: number }>;
}

/**
 * Standard Format legality warning.
 *
 * Renders only when there are cards in the deck that are no longer legal
 * in the current Standard Format. Lists the offending cards and offers an
 * (i) info button explaining the rotation.
 *
 * (Component name is historical — kept as RotationBanner for now to avoid
 * a wide rename. The phrasing inside has moved away from "rotation" toward
 * "Standard Format legality.")
 */
export default function RotationBanner({ rotatingCards }: Props) {
  if (rotatingCards.length === 0) return null;

  const count = rotatingCards.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-4">
      <div className="flex items-center gap-3 mb-3">
        <svg
          className="w-4 h-4 text-yellow-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-text-primary">
              Not legal in Standard Format
            </p>
            <StandardFormatInfo />
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {count} card{count !== 1 ? "s" : ""} no longer legal
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-7">
        {rotatingCards.map((c) => (
          <span
            key={c.name}
            className="inline-flex items-center gap-1 rounded-full border border-yellow-500/50 bg-yellow-500/10 px-2.5 py-0.5 text-xs text-text-secondary"
          >
            <span className="font-semibold">{c.qty}</span>
            <span>{c.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
