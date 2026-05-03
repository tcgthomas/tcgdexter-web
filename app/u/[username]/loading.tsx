import ProfileSkeleton from "@/app/components/skeletons/ProfileSkeleton";

/**
 * Profile shell — full-page skeleton (we don't know the username's display
 * name yet, so the whole profile card is a skeleton).
 */
export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <ProfileSkeleton />
    </main>
  );
}
