import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-primary rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Building className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold">Staff Management</CardTitle>
            <CardDescription>
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter your email" 
                          data-testid="input-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your password" 
                          data-testid="input-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-primary text-primary-foreground p-12 items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="text-4xl font-bold mb-6">
            Streamline Your Business Operations
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Manage staff attendance, track sales, handle payroll, and oversee proposals all in one comprehensive platform.
          </p>
          <ul className="text-left space-y-3 opacity-90">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-primary-foreground rounded-full mr-3"></div>
              Real-time attendance tracking
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-primary-foreground rounded-full mr-3"></div>
              Automated payroll calculations
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-primary-foreground rounded-full mr-3"></div>
              Proposal management workflow
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-primary-foreground rounded-full mr-3"></div>
              Sales reporting and analytics
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}