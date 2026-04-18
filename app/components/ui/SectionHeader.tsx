/**
 * Section intro: tiny uppercase eyebrow in the accent red, then a large
 * tracking-tight heading. Used throughout the home page and mirrored pages
 * to frame each section.
 */
export default function SectionHeader({
  eyebrow,
  title,
  align = "left",
  children,
}: {
  eyebrow?: string;
  title: string;
  align?: "left" | "center";
  children?: React.ReactNode;
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      {eyebrow && (
        <div className="text-xs uppercase tracking-widest text-[#D91E0D] mb-3">
          {eyebrow}
        </div>
      )}
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
        {title}
      </h2>
      {children && <div className="mt-3 text-text-secondary">{children}</div>}
    </div>
  );
}
