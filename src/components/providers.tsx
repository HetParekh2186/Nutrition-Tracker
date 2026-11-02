"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {/* "user" switches springs to instant changes under reduced motion. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast:
              "!rounded-xl !border !border-border !bg-surface !text-ink !shadow-float",
            description: "!text-ink-muted",
            actionButton: "!bg-surface-2 !text-ink",
          },
        }}
      />
    </QueryClientProvider>
  );
}
