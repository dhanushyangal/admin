import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { CLERK_JS_VERSION, clerkPreconnectHost } from "@/lib/clerkConfig";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hydrilla Admin",
  description: "Hydrilla internal admin",
  robots: { index: false, follow: false },
  icons: { icon: "/hyd01.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const clerkHost = clerkPreconnectHost();

  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {clerkHost ? <link rel="preconnect" href={clerkHost} crossOrigin="" /> : null}
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider
            clerkJSVersion={CLERK_JS_VERSION}
            signInUrl="/login"
            signInFallbackRedirectUrl="/"
            afterSignOutUrl="/login"
          >
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
