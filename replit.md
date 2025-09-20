# Overview

This is a multi-role employee management system built with React, TypeScript, Express, and PostgreSQL. The application serves staff, managers, and administrators with different access levels for attendance tracking, sales reporting, cashflow management, payroll processing, and proposal submissions. The system supports multiple stores and includes role-based authentication and authorization.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using React with TypeScript and follows a modern component-based architecture:

- **Framework**: React with Vite for build tooling and hot module replacement
- **Styling**: Tailwind CSS with shadcn/ui components for consistent design system
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod for validation and type safety
- **Authentication**: Context-based auth provider with protected routes

The frontend is organized into feature-based modules (attendance, sales, cashflow, payroll, proposals) with shared UI components and utilities.

## Backend Architecture
The server uses Express.js with TypeScript in a RESTful API pattern:

- **Framework**: Express.js with session-based authentication using Passport.js
- **Authentication**: Local strategy with bcrypt password hashing and express-session
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful endpoints organized by feature domains
- **Middleware**: Custom logging, error handling, and authentication middleware

## Database Design
Uses PostgreSQL with Drizzle ORM for type-safe database operations:

- **ORM**: Drizzle with TypeScript schema definitions
- **Schema**: Relational design with users, stores, attendance, sales, cashflow, payroll, and proposals tables
- **Multi-tenancy**: Store-based data isolation with storeId foreign keys
- **Migrations**: Drizzle Kit for schema management and migrations

## Role-Based Access Control
Three-tier role system with different permissions:

- **Staff**: Can submit attendance and view their own records
- **Manager**: Full access to store operations including approval workflows
- **Administrator**: System-wide access across all stores and administrative functions

## Development Architecture
Monorepo structure with shared types and utilities:

- **Shared Schema**: Common TypeScript types between client and server
- **Development Tools**: Concurrent dev servers with Vite HMR and Express nodemon
- **Build Process**: Vite for client bundling, esbuild for server compilation
- **Type Safety**: End-to-end TypeScript with shared interfaces and validation schemas

# External Dependencies

## Database
- **PostgreSQL**: Primary database with Neon serverless hosting support
- **Drizzle ORM**: Type-safe database toolkit with migration support

## Authentication & Security  
- **Passport.js**: Authentication middleware with local strategy
- **express-session**: Session management with PostgreSQL storage
- **connect-pg-simple**: PostgreSQL session store adapter

## UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Lucide Icons**: Icon library for consistent iconography

## State Management & HTTP
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation and parsing

## Development & Build Tools
- **Vite**: Frontend build tool with HMR and development server
- **esbuild**: Fast JavaScript bundler for server compilation
- **TypeScript**: Static type checking across the entire application
- **Replit Plugins**: Development banner and error overlay for Replit environment