import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MyDecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile?.username ? `/u/${profile.username}` : "/settings");
}
