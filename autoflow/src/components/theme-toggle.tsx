"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === "light" || t === "dark" ? t : "system");
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") {
      delete root.dataset.theme;
      document.cookie = "af_theme=; path=/; max-age=0; samesite=lax";
    } else {
      root.dataset.theme = next;
      document.cookie = `af_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    }
  }

  const opts: { v: Theme; icon: typeof Sun; label: string }[] = [
    { v: "light", icon: Sun, label: "Luminos" },
    { v: "dark", icon: Moon, label: "Întunecat" },
    { v: "system", icon: Monitor, label: "Sistem" },
  ];
  return (
    <div role="radiogroup" aria-label="Temă" className="flex rounded-lg border border-line bg-surface-2 p-0.5">
      {opts.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          role="radio"
          aria-checked={theme === v}
          title={label}
          onClick={() => apply(v)}
          className={clsx(
            "grid size-7 place-items-center rounded-md transition",
            theme === v ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          <Icon className="size-3.5" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
