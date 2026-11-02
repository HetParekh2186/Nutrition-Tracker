import type { ReactNode } from "react";

import { Providers } from "@/components/providers";

// Full-screen flows without the app navigation: onboarding, Cook Mode.
export default function FocusLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
