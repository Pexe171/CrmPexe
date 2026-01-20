"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST"
    });

    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <Button variant="outline" onClick={onLogout} disabled={isPending}>
      {isPending ? "Saindo..." : "Sair"}
    </Button>
  );
}
