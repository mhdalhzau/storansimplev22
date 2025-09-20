import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, UserIcon, Building2Icon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  storeNames: string;
}

export default function EmployeeListPage() {
  const { user } = useAuth();
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    enabled: !!user
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Manajemen Absensi Karyawan
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Kelola dan pantau kehadiran karyawan secara bulanan
            </p>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-4">
        {employees && employees.length > 0 ? (
          employees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow" data-testid={`card-employee-${employee.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid={`text-employee-name-${employee.id}`}>
                        {employee.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span data-testid={`text-employee-email-${employee.id}`}>{employee.email}</span>
                        <div className="flex items-center gap-1">
                          <Building2Icon className="h-4 w-4" />
                          <span data-testid={`text-employee-stores-${employee.id}`}>{employee.storeNames}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link href={`/attendance/employee/${employee.id}`} data-testid={`link-attendance-detail-${employee.id}`}>
                    <Button className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Lihat Absensi
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Tidak ada karyawan
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Belum ada data karyawan yang dapat ditampilkan.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}