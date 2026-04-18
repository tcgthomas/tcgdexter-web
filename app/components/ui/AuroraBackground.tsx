/**
 * Fixed-position radial-gradient wash + dot grid that sits behind every
 * page in the /experiments/* sandbox. Rendered at `-z-10` so page content
 * always paints on top.
 */
export default function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-[640px] w-[1100px] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle at center, #ff8a3d 0%, #ffd3a8 40%, transparent 70%)" }}
      />
      <div
        className="absolute top-80 -left-40 h-[500px] w-[500px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle at center, #d95555 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-[900px] -right-40 h-[520px] w-[520px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle at center, #c4b5fd 0%, transparent 70%)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(#1a1a1a 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
    </div>
  );
}
