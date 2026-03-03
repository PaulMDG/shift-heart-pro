import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import AppHeader from "./AppHeader";

interface MobileLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

const MobileLayout = ({ children, showHeader = true }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {showHeader && <AppHeader />}
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  );
};

export default MobileLayout;
