"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client, so render neutral until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div role="group" aria-label="Theme" className="flex gap-1">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <Button
            key={value}
            variant={active ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={active}
            onClick={() => setTheme(value)}
          >
            <Icon aria-hidden />
            {label}
          </Button>
        );
      })}
    </div>
  );
}
