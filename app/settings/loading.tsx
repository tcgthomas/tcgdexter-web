import SettingsSkeleton from "@/app/components/skeletons/SettingsSkeleton";

/**
 * Settings shell. Title is real; account/profile rows are skeletons.
 */
export default function SettingsLoading() {
  return (
    <main className="mx-auto max-w-2xl px-6 pt-[calc(env(safe-area-inset-top)_+_1.68rem)] md:pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-24">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary mb-8">Settings</h1>
      <SettingsSkeleton />
    </main>
  );
}
