// The route focus (DESIGN.md 10) handed from a lazy page's fallback to the page: the shell focuses
// the fallback's title, the fallback notes it when it unmounts with the focus, and the page's own
// title takes it on mounting, so the focus never drops to the body in between.

let pending = false

/** The fallback's title held the route focus as it left. */
export function handOffTitleFocus(): void {
  pending = true
}

/** Whether a page mounting now should take the route focus; asking clears it. */
export function takeTitleFocus(): boolean {
  const taken = pending
  pending = false
  return taken
}
