import { useAuth } from "@/hooks/use-auth";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  activeMenu: string;
}

const menuTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Welcome back",
  },
  attendance: {
    title: "Attendance Management",
    subtitle: "Manage staff attendance and overtime",
  },
  sales: {
    title: "Sales Reports",
    subtitle: "View and export sales data",
  },
  cashflow: {
    title: "Cashflow Management",
    subtitle: "Track income and expenses",
  },
  payroll: {
    title: "Payroll Management",
    subtitle: "Manage staff payroll",
  },
  proposal: {
    title: "Proposals",
    subtitle: "Submit and review proposals",
  },
  overtime: {
    title: "Overtime Management",
    subtitle: "Approve overtime requests",
  },
};

export default function TopBar({ activeMenu }: TopBarProps) {
  const { user } = useAuth();

  if (!user) return null;

  const currentMenu = menuTitles[activeMenu] || menuTitles.dashboard;
  const userInitials = user.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            {currentMenu.title}
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            {currentMenu.subtitle}, <span className="font-medium">{user.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground" data-testid="text-user-initials">
                {userInitials}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
