interface Props {
  setCode: string | null;
  setId: string;
  number: string;
  setSize: number;
  marketPrice: number;
}

function formatPrice(p: number): string {
  if (!p || p <= 0) return "—";
  if (p >= 1000) return `$${Math.round(p).toLocaleString()}`;
  return `$${p.toFixed(2)}`;
}

function padNumber(n: string): string {
  const m = n.match(/^(\d+)(.*)$/);
  if (!m) return n;
  return m[1].padStart(3, "0") + m[2];
}

export default function CardFooterOverlay({
  setCode,
  setId,
  number,
  setSize,
  marketPrice,
}: Props) {
  const code = (setCode || setId).toUpperCase();
  const num = padNumber(number);
  const leading = setSize > 0 ? `${code} ${num}/${setSize}` : `${code} ${num}`;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[10%] min-h-[24px] flex items-end justify-between gap-1 px-1.5 pb-1 bg-gradient-to-b from-transparent to-black text-white text-[10px] font-semibold leading-none tabular-nums overflow-hidden">
      <span className="truncate">{leading}</span>
      <span className="shrink-0">{formatPrice(marketPrice)}</span>
    </div>
  );
}
