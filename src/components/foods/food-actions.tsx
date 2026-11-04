"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CustomFoodForm } from "@/components/log/custom-food-form";
import { useQuickLog } from "@/components/log/quick-log-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { keys } from "@/hooks/use-diary";

/** Opens Quick Log on its search, as the header button does. */
export function SearchFoodsButton() {
  const { open } = useQuickLog();
  return (
    <Button variant="outline" onClick={() => open()}>
      <Search aria-hidden />
      Search foods
    </Button>
  );
}

/**
 * "Create food": the custom food form in a dialog. A new food goes straight
 * into My foods, and Quick Log opens on it so it can be logged right away.
 */
export function CreateFoodButton({
  variant = "outline",
  size = "sm",
}: {
  variant?: "outline" | "default";
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();
  const quickLog = useQuickLog();

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Create food
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Create a custom food</DialogTitle>
          <DialogDescription className="sr-only">
            Copy the values from a nutrition label, per serving.
          </DialogDescription>
          <CustomFoodForm
            backLabel="Close"
            onBack={() => setOpen(false)}
            onCreated={(hit) => {
              setOpen(false);
              void qc.invalidateQueries({ queryKey: keys.myFoods });
              router.refresh();
              toast.success("Saved to My foods", {
                description: hit.name,
                action: {
                  label: "Log it",
                  onClick: () =>
                    quickLog.open({
                      step: { kind: "amount", hit, loggedVia: "search" },
                    }),
                },
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
