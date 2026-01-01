import type { ReactNode } from "react";
import Link from "next/link";
import { Navbar01 } from '@/components/ui/shadcn-io/navbar-01';


type MarketingLayoutProps = {
  children: ReactNode;
};

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="relative w-full z-50">
        <Navbar01 />
      </div>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
