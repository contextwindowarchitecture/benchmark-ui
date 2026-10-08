import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { shortDigest } from "@/lib/format"

export type DigestProps = {
  value: string
  /** What the digest identifies, for the copy button's name: "source digest", "python commit". */
  label: string
  /** Shows the whole value instead of its first seven hex characters. */
  full?: boolean
}

/** Seven hex characters with a button that copies the whole (ui-plan.md 11). */
export function Digest({ value, label, full = false }: DigestProps) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  const canCopy =
    typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function"
  return (
    <span className="inline-flex items-center gap-1">
      <code className="font-mono text-xs" title={value}>
        {full ? value : shortDigest(value)}
      </code>
      {canCopy ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
          title={`Copy ${label}`}
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => setCopied(true))
          }}
        >
          {copied ? (
            <Check aria-hidden="true" className="text-success" />
          ) : (
            <Copy aria-hidden="true" />
          )}
        </Button>
      ) : null}
    </span>
  )
}
