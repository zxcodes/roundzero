import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const onToggle = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label="Toggle theme"
      className="relative"
    >
      <HugeiconsIcon
        icon={Sun01Icon}
        strokeWidth={2}
        className="size-4 scale-100 rotate-0 opacity-100 transition-all duration-300 ease-out dark:scale-0 dark:-rotate-180 dark:opacity-0"
      />
      <HugeiconsIcon
        icon={Moon02Icon}
        strokeWidth={2}
        className="absolute size-4 scale-0 rotate-180 opacity-0 transition-all duration-300 ease-out dark:scale-100 dark:rotate-0 dark:opacity-100"
      />
    </Button>
  );
}
