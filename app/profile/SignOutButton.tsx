"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Refresh to re-run the server component and redirect to /sign-in.
    router.refresh();
    router.push("/");
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="w-full rounded-lg border border-border bg-bg px-5 py-3 text-sm font-semibold text-text-secondary transition-all hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
