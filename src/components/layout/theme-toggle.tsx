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

/** Light, dark or system, as a menu on one icon button with an accessible name. */
export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme()
  const Icon = resolved === "dark" ? Moon : Sun
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Theme: ${LABELS[theme]}`} title="Theme">
          <Icon aria-hidden="true" />
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
