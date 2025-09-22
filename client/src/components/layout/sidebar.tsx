import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Building, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  FileText, 
  Users,
  Store,
  UserCheck,
  Settings,
  LogOut,
  Contact,
  Receipt 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: string[];
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <BarChart3 className="w-5 h-5" />,
    allowedRoles: ["staff", "manager", "administrasi"],
  },
  {
    id: "staff-management",
    label: "Staff Management",
    icon: <UserCheck className="w-5 h-5" />,
    allowedRoles: ["manager", "administrasi"],
  },
  {
    id: "sales",
    label: "Sales Reports",
    icon: <TrendingUp className="w-5 h-5" />,
    allowedRoles: ["manager", "administrasi"],
  },
  {
    id: "cashflow",
    label: "Cashflow",
    icon: <DollarSign className="w-5 h-5" />,
    allowedRoles: ["manager", "administrasi"],
  },
  {
    id: "customers",
    label: "Customers",
    icon: <Contact className="w-5 h-5" />,
    allowedRoles: ["manager", "administrasi"],
  },
  {
    id: "piutang",
    label: "Piutang (A/R)",
    icon: <Receipt className="w-5 h-5" />,
    allowedRoles: ["manager", "administrasi"],
  },
  {
    id: "payroll",
    label: "Payroll",
    icon: <Wallet className="w-5 h-5" />,
    allowedRoles: ["manager", "administrasi"],
  },
  {
    id: "proposal",
    label: "Proposals",
    icon: <FileText className="w-5 h-5" />,
    allowedRoles: ["staff", "manager", "administrasi"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
    allowedRoles: ["manager"],
  },
];

export default function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const filteredMenuItems = menuItems.filter(item => 
    item.allowedRoles.includes(user.role)
  );

  const getStoreName = () => {
    switch (user.storeId) {
      case 1:
        return "Main Store";
      case 2:
        return "Branch Store";
      default:
        return "Store";
    }
  };

  return (
    <aside className="fixed left-0 top-0 w-64 h-full bg-card border-r border-border z-40">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-lg w-10 h-10 flex items-center justify-center">
            <Building className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground" data-testid="text-store-name">
              {getStoreName()}
            </h2>
            <p className="text-sm text-muted-foreground capitalize" data-testid="text-user-role">
              {user.role}
            </p>
          </div>
        </div>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => (
            <li key={item.id}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-auto py-3 px-3",
                  activeMenu === item.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => onMenuChange(item.id)}
                data-testid={`link-${item.id}`}
              >
                {item.icon}
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-auto py-3 px-3 text-muted-foreground hover:text-destructive"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
