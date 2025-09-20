import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Users, Store, Settings as SettingsIcon, Cloud, Database } from "lucide-react";
import UserManagementContent from "@/components/user-management/user-management-content";
import StoreManagementContent from "@/components/store-management/store-management-content";
import GoogleSheetsConfigContent from "@/components/settings/google-sheets-config-content";

interface SettingsMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: string[];
  description: string;
}

const settingsMenuItems: SettingsMenuItem[] = [
  {
    id: "user-management",
    label: "User Management",
    icon: <Users className="w-5 h-5" />,
    allowedRoles: ["manager"],
    description: "Manage employee registration, salaries, and store assignments"
  },
  {
    id: "store-management", 
    label: "Store Management",
    icon: <Store className="w-5 h-5" />,
    allowedRoles: ["manager"],
    description: "Manage store information and personnel"
  },
  {
    id: "google-sheets-sync",
    label: "Google Sheets Sync",
    icon: <Cloud className="w-5 h-5" />,
    allowedRoles: ["manager"],
    description: "Configure sync to Google Sheets for data backup and analysis"
  }
];

export default function SettingsContent() {
  const { user } = useAuth();

  if (!user) return null;

  const filteredMenuItems = settingsMenuItems.filter(item => 
    item.allowedRoles.includes(user.role)
  );

  const [activeSettingsMenu, setActiveSettingsMenu] = useState(
    filteredMenuItems.length > 0 ? filteredMenuItems[0].id : "user-management"
  );

  if (user.role !== "manager") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <SettingsIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">Access denied. Manager role required.</p>
        </div>
      </div>
    );
  }

  const renderSettingsContent = () => {
    switch (activeSettingsMenu) {
      case "user-management":
        return <UserManagementContent />;
      case "store-management":
        return <StoreManagementContent />;
      case "google-sheets-sync":
        return <GoogleSheetsConfigContent />;
      default:
        return <UserManagementContent />;
    }
  };

  const currentMenuItem = filteredMenuItems.find(item => item.id === activeSettingsMenu) || filteredMenuItems[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Settings Menu */}
      <div className="lg:col-span-1">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Settings Menu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredMenuItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-auto py-3 px-3 text-left ${
                  activeSettingsMenu === item.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => setActiveSettingsMenu(item.id)}
                data-testid={`settings-menu-${item.id}`}
              >
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {item.description}
                  </div>
                </div>
              </Button>
            ))}

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="px-3">
                <h3 className="text-xs font-medium text-foreground mb-2">System Info</h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Current User:</span>
                    <Badge variant="outline" className="text-xs">
                      {user.name}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Role:</span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database:</span>
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      <span>Connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Content */}
      <div className="lg:col-span-3">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2">
            {currentMenuItem?.icon}
            <h2 className="text-lg font-semibold">{currentMenuItem?.label}</h2>
          </div>
          
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
}