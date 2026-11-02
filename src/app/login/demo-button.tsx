"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

import { signInAsDemo } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={pending}
    >
      {pending ? "Opening the demo" : label}
    </Button>
  );
}

/** Signs in to the shared demo account with one click. */
export function DemoButton({
  label = "Try the demo account",
}: {
  label?: string;
}) {
  return (
    <form action={signInAsDemo}>
      <Submit label={label} />
    </form>
  );
}
