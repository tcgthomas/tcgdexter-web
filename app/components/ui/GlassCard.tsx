/**
 * Rounded-2xl glass-white card with a hair-thin border and soft shadow.
 * The default surface for content panels in the /experiments sandbox.
 *
 * Pass `tone="plain"` for a translucent background (no shadow) when the
 * card nests inside another surface.
 */
export default function GlassCard({
  children,
  className = "",
  tone = "solid",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "solid" | "plain";
}) {
  const toneClasses =
    tone === "solid"
      ? "bg-white/90 backdrop-blur-xl shadow-sm"
      : "bg-white/60 backdrop-blur-sm";
  return (
    <div className={`rounded-2xl border border-black/8 ${toneClasses} ${className}`}>
      {children}
    </div>
  );
}
