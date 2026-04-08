import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

/**
 * Account page — shows the signed-in user's email and display name.
 * Redirects to /sign-in if the user is not authenticated.
 *
 * Server component — reads the user from the session cookie directly,
 * no client-side auth check needed.
 */
export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch the profile row (created by the handle_new_user trigger on signup).
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, tier, created_at")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex-shrink-0 pb-8 px-6 text-center" style={{ paddingTop: "calc(env(safe-area-inset-top) + 4rem)" }}>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Account
        </h1>
      </header>

      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-sm">
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <Row label="Display name" value={profile?.display_name ?? "—"} />
            <Row label="Email" value={user.email ?? "—"} />
            <Row
              label="Tier"
              value={
                <span className="capitalize">{profile?.tier ?? "free"}</span>
              }
            />
            <Row
              label="Joined"
              value={
                profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"
              }
              last
            />
          </div>

          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
      </main>

      <footer className="flex-shrink-0 py-8 px-6 text-center text-sm text-text-muted">
        <p>&copy; 2026 TCG Dexter &middot; tcgdexter.com</p>
      </footer>
    </div>
  );
}

function Row({
  label,
  value,
  last = false,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}
