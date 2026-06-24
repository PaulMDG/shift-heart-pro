import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import AppHeader from "./AppHeader";

interface MobileLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

const MobileLayout = ({ children, showHeader = true }: MobileLayoutProps) => {
  return (
    <div className="theme-canvas min-h-dvh bg-canvas text-canvas-foreground max-w-lg mx-auto relative">
      {showHeader && <AppHeader />}
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  );
};

export default MobileLayout;
