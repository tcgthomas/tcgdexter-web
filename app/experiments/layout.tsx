import AuroraBackground from "./_design/AuroraBackground";
import ExperimentNav from "./_design/ExperimentNav";
import ExperimentFooter from "./_design/ExperimentFooter";

/**
 * Shared shell for every page under /experiments/*.
 * Provides the aurora background, sticky nav, and minimal footer so
 * each mirror page can focus on its own body content.
 *
 * Scoped to /experiments only — prod routes are unaffected.
 */
export default function ExperimentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg text-text-primary antialiased overflow-x-hidden">
      <AuroraBackground />
      <ExperimentNav />
      {children}
      <ExperimentFooter />
    </div>
  );
}
