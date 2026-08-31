import { SignIn } from "@clerk/nextjs";
import { HydrillaMark } from "@/components/hydrilla-mark";
import { ModeToggle } from "@/components/mode-toggle";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="mb-8 flex flex-col items-center gap-3">
        <HydrillaMark />
        <p className="text-lg font-semibold tracking-tight text-foreground">Hydrilla</p>
      </div>
      <SignIn forceRedirectUrl="/" fallbackRedirectUrl="/" />
    </div>
  );
}
