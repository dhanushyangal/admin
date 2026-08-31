"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Access limited</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This admin console is only available to @hydrilla.ai accounts.
      </p>
      <SignOutButton redirectUrl="/login">
        <Button className="mt-6" variant="outline">
          Sign out
        </Button>
      </SignOutButton>
    </div>
  );
}
