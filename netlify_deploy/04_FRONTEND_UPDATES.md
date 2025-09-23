# 04. Frontend Updates untuk Netlify

## 🎯 Overview

Update React frontend untuk bekerja dengan Netlify Functions endpoints.

## 🔧 Update API Base URL

### 1. Modify Query Client Configuration

**File: `client/src/lib/queryClient.ts`**

**Sebelum:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }: { queryKey: QueryKey }) => {
        const response = await fetch(`/api${queryKey[0]}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      },
    },
  },
});
```

**Sesudah:**
```typescript
// Environment-aware API base URL
function getApiBaseUrl(): string {
  // In production (Netlify), use function endpoints
  if (import.meta.env.PROD) {
    return '/.netlify/functions/api';
  }
  
  // Custom API URL dari environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development fallback
  return '/api';
}

const API_BASE = getApiBaseUrl();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }: { queryKey: QueryKey }) => {
        const url = `${API_BASE}${queryKey[0]}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorData}`);
        }
        
        return response.json();
      },
    },
  },
});

// Export API request helper untuk mutations
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important untuk session cookies
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorData}`);
  }
  
  return response.json();
}

export { queryClient };
```

### 2. Update Environment Variables

**File: `client/.env.production`**
```env
VITE_API_URL=/.netlify/functions/api
VITE_NODE_ENV=production
```

**File: `client/.env.development`**
```env
VITE_API_URL=/api
VITE_NODE_ENV=development
```

**File: `client/.env.local`** (untuk testing)
```env
VITE_API_URL=http://localhost:8888/.netlify/functions/api
VITE_NODE_ENV=testing
```

## 🔐 Authentication Updates

### 1. Update Auth Hook

**File: `client/src/hooks/use-auth.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'staff' | 'manager' | 'administrasi';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await apiRequest('/user');
      setUser(userData);
    } catch (error) {
      // User not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const userData = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    setUser(userData);
  };

  const logout = async () => {
    await apiRequest('/logout', {
      method: 'POST',
    });
    
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 2. Update API Calls untuk CORS

**Add CORS handling untuk cross-origin requests:**

```typescript
// client/src/lib/api-client.ts
export class ApiClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = getApiBaseUrl();
  }
  
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      mode: 'cors', // Enable CORS
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as T;
  }
  
  // Convenience methods
  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }
  
  post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
```

## 📱 Update Component API Calls

### 1. Sales Component Example

**File: `client/src/components/sales/sales-content.tsx`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function SalesContent() {
  const queryClient = useQueryClient();
  
  // Fetch sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['/sales'],
    queryFn: () => apiClient.get('/sales'),
  });
  
  // Create sales mutation
  const createSalesMutation = useMutation({
    mutationFn: (salesData: any) => apiClient.post('/sales', salesData),
    onSuccess: () => {
      // Invalidate and refetch sales data
      queryClient.invalidateQueries({ queryKey: ['/sales'] });
    },
  });
  
  const handleCreateSales = async (formData: any) => {
    try {
      await createSalesMutation.mutateAsync(formData);
      // Success handling
    } catch (error) {
      // Error handling
      console.error('Failed to create sales:', error);
    }
  };
  
  if (isLoading) {
    return <div>Loading sales data...</div>;
  }
  
  return (
    <div>
      {/* Sales content */}
    </div>
  );
}
```

### 2. Attendance Component Example

```typescript
// client/src/components/attendance/attendance-content.tsx
export function AttendanceContent() {
  const { data: attendance } = useQuery({
    queryKey: ['/attendance'],
    queryFn: () => apiClient.get('/attendance'),
  });
  
  const createAttendanceMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/attendance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/attendance'] });
    },
  });
  
  // Component logic...
}
```

## 🔧 Build Configuration Updates

### 1. Update Vite Config

**File: `client/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
    },
  },
  build: {
    outDir: "build", // Netlify expects 'build' directory
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    proxy: {
      // Proxy API calls dalam development
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions/api')
      }
    }
  },
  preview: {
    port: 5000,
  }
});
```

### 2. Update Package.json Scripts

**File: `client/package.json`**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:netlify": "VITE_API_URL=/.netlify/functions/api vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  }
}
```

## 🧪 Testing Setup

### 1. Test API Connectivity

```typescript
// client/src/utils/api-test.ts
export async function testApiConnection() {
  try {
    const response = await apiClient.get('/health');
    console.log('API Health Check:', response);
    return true;
  } catch (error) {
    console.error('API Connection Failed:', error);
    return false;
  }
}

// Call in development
if (import.meta.env.DEV) {
  testApiConnection();
}
```

### 2. Error Boundary untuk API Errors

```typescript
// client/src/components/error-boundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('API Error Boundary caught an error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-800 font-semibold">API Error</h2>
          <p className="text-red-600">
            Failed to connect to the server. Please check your connection.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## ✅ Verification Checklist

- [ ] API base URL updated untuk production
- [ ] Environment variables configured
- [ ] Auth hooks updated untuk serverless
- [ ] API client handles CORS properly
- [ ] Components use new API client
- [ ] Build configuration updated
- [ ] Error handling implemented
- [ ] Testing utilities created

## 🔄 Next Steps

Lanjut ke `05_ENVIRONMENT_VARS.md` untuk setup environment variables di Netlify dashboard.