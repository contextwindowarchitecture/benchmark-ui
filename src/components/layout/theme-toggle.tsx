import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/lib/theme-context"
import { THEMES, type Theme } from "@/lib/theme-constants"

const LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" }

/**
 * Light, dark or system, as a menu on the website's ghost pill: mono, muted, a hairline outline, and
 * the theme in use as its word.
 */
export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme()
  const Icon = resolved === "dark" ? Moon : Sun
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Theme: ${LABELS[theme]}`}
          title="Theme"
          className="border-border bg-transparent font-mono text-[12px] font-normal tracking-[0.05em] text-muted-foreground hover:border-foreground hover:bg-transparent hover:text-foreground aria-expanded:border-foreground aria-expanded:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
        >
          <Icon aria-hidden="true" />
          {LABELS[theme]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          {THEMES.map((option) => {
            const OptionIcon = option === "light" ? Sun : option === "dark" ? Moon : Monitor
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <OptionIcon aria-hidden="true" className="mr-2 size-4" />
                {LABELS[option]}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
