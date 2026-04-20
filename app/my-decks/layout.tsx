/**
 * /my-decks layout. Renders the list (`children`) with a parallel `modal`
 * slot. When the user navigates from /my-decks to /my-decks/[id] via a
 * <Link>, Next intercepts via `@modal/(.)[id]/page.tsx` and renders the
 * detail into the `modal` slot on top of the list — the list never
 * unmounts. Direct visits and reloads fall through to the standalone
 * `[id]/page.tsx` route.
 */
export default function MyDecksLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
