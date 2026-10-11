// The cells Domain 2's row columns share: a reply or an open value as text, clamped with the whole
// of it as its title, and whether the fact an answer needed was sent.

export function Text({ value, mono = false }: { value: string | null; mono?: boolean }) {
  if (value === null || value === "") return <span className="text-muted-foreground">—</span>
  return (
    <span
      className={`line-clamp-3 max-w-xs text-xs break-words whitespace-pre-wrap ${mono ? "font-mono" : ""}`}
      title={value}
    >
      {value}
    </span>
  )
}

export function Fact({ present }: { present: boolean | null | undefined }) {
  if (present === null || present === undefined)
    return <span className="text-xs text-muted-foreground">—</span>
  return present ? (
    <span className="text-xs">sent</span>
  ) : (
    <span className="text-xs font-medium text-warning">not sent</span>
  )
}
