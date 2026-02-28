"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />; // Placeholder to avoid Layout Shift
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors duration-200 focus:outline-none"
      aria-label="Toggle theme"
    >
      <Sun className="h-[1.1rem] w-[1.1rem] transition-all scale-100 rotate-0 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.1rem] w-[1.1rem] transition-all scale-0 rotate-90 dark:rotate-0 dark:scale-100" />
    </button>
  );
}
