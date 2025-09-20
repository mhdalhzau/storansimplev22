import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import DashboardContent from "@/components/dashboard/dashboard-content";
import AttendanceContent from "@/components/attendance/attendance-content";
import SalesContent from "@/components/sales/sales-content";
import CashflowContent from "@/components/cashflow/cashflow-content";
import PayrollContent from "@/components/payroll/payroll-content";
import ProposalContent from "@/components/proposal/proposal-content";
import OvertimeContent from "@/components/overtime/overtime-content";
import EmployeeListPage from "@/pages/attendance/employee-list";
import CustomerPage from "@/pages/customer-page";
import PiutangPage from "@/pages/piutang-page";
import SettingsContent from "@/components/settings/settings-content";

export default function HomePage() {
  const { user } = useAuth();
  const [activeMenu, setActiveMenu] = useState("dashboard");

  // ProtectedRoute ensures user is always present here

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return <DashboardContent />;
      case "attendance":
        return <AttendanceContent />;
      case "staff-management":
        return <EmployeeListPage />;
      case "sales":
        return <SalesContent />;
      case "cashflow":
        return <CashflowContent />;
      case "customers":
        return <CustomerPage />;
      case "piutang":
        return <PiutangPage />;
      case "payroll":
        return <PayrollContent />;
      case "proposal":
        return <ProposalContent />;
      case "overtime":
        return <OvertimeContent />;
      case "settings":
        return <SettingsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
      <main className="ml-64 min-h-screen">
        <TopBar activeMenu={activeMenu} />
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
