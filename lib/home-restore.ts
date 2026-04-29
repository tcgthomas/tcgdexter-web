/**
 * Tiny helper around sessionStorage for the "anonymous user pasted a deck,
 * clicked Save/Share, was bounced to /sign-in" flow. After auth, the home
 * page reads the stash to pre-fill the textarea so the user doesn't lose
 * their work.
 *
 * We stash only the deck list string (cheap, well under the ~5MB session
 * cap). The analysis is re-derived client-side via /api/analyze when the
 * user re-triggers the action, so we don't need to persist it.
 */

const KEY = "tcgdex.home.deckList";

export function stashDeckList(deckList: string) {
  try {
    sessionStorage.setItem(KEY, deckList);
  } catch {
    // sessionStorage can throw in private mode; the worst case is the user
    // has to re-paste, which is acceptable.
  }
}

export function popDeckList(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    if (value !== null) sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}
