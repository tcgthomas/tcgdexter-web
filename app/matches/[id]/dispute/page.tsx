import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DisputeForm from "./DisputeForm";

export const metadata: Metadata = {
  title: "Request Judge Ruling — TCG Dexter",
};

export default async function DisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/matches/${id}/dispute`);

  const { data: match } = await supabase
    .from("shared_matches")
    .select("id, creator_user_id, opponent_user_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!match) notFound();
  const isParticipant =
    match.creator_user_id === user.id || match.opponent_user_id === user.id;
  if (!isParticipant) notFound();

  if (match.status === "finalized") {
    redirect(`/matches/${id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Request a judge ruling
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Upload a screenshot or photo (TCG Live screen, board state, etc.) showing
        the result. A judge will review and finalize the match. While under
        review, neither player can change their submission.
      </p>

      <DisputeForm matchId={id} />
    </main>
  );
}
