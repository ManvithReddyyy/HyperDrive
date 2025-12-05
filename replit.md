# HyperDrive - AI Model Optimization Platform

## Overview

HyperDrive is an AI model optimization platform that transforms heavy AI models into faster, smaller versions through advanced optimization techniques. The application provides a complete workflow from model upload and configuration through optimization processing to deployment code generation. Built with a Notion-inspired minimalist aesthetic, it emphasizes clarity and functionality over visual flourish.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool. The application uses a client-side routing approach with the `wouter` library for navigation.

**UI Component System**: Built on shadcn/ui components (Radix UI primitives) with extensive customization. The design system enforces a "Sophisticated Minimalism" aesthetic modeled after Notion's interface, featuring:
- Zinc-based color palette with subtle neutrals
- Inter font family for UI text, JetBrains Mono for code/logs
- Small, flat buttons (h-7/h-8) with minimal shadows
- Typography hierarchy through weight and color rather than size
- Icons exclusively from lucide-react at 14px-16px

**State Management**: TanStack Query (React Query) handles all server state with custom query functions. No global client state management library is used - component-level state with React hooks suffices.

**Styling**: TailwindCSS with extensive CSS custom properties for theming. The configuration defines specific color scales, border radii, and elevation utilities (hover-elevate, active-elevate-2) for interaction states.

**Key Pages**:
- `/upload` - Model configuration and job creation interface
- `/jobs` - Job history listing with status indicators
- `/jobs/:id` - Detailed job monitoring with real-time pipeline progress
- `/playground` - Interactive model inference comparison
- `/deploy` - Deployment code generation and export

### Backend Architecture

**Server Framework**: Express.js with TypeScript, built as an ESM module. The server handles both API routes and static file serving in production.

**API Design**: RESTful endpoints at `/api/*` with WebSocket support for real-time job updates. Key endpoints include job creation, retrieval, and deployment code generation.

**Real-time Updates**: WebSocket server on `/ws` path enables live job progress streaming. Clients subscribe to specific job IDs and receive updates as pipeline steps complete.

**Storage Layer**: In-memory storage implementation (MemStorage class) serves as the data layer. This is an interface-based design (IStorage) that could be swapped for database persistence without changing business logic.

**Build Process**: Custom build script using esbuild for server bundling and Vite for client bundling. Server dependencies are selectively bundled (allowlist) to optimize cold start performance.

### Data Storage Solutions

**Current Implementation**: In-memory storage using JavaScript Maps. Job data includes:
- Job metadata (filename, size, configuration)
- Optimization configuration (quantization, target device, strategy)
- Pipeline step tracking with status and duration
- Logs and progress percentages
- Performance metrics (latency improvements, size reduction)

**Design Decision**: Memory storage chosen for simplicity and rapid development. The interface-based design (IStorage) allows future migration to PostgreSQL without touching business logic. Drizzle ORM configuration is present but not actively used.

**Rationale**: This approach provides:
- Immediate functionality without database setup complexity
- Clear migration path when persistence is needed
- Fast prototyping and testing cycles

**Trade-offs**: Data is lost on server restart, no multi-instance support, memory constraints at scale. These are acceptable for development and MVP stages.

### External Dependencies

**UI Component Libraries**:
- Radix UI primitives (@radix-ui/*) - Accessible, unstyled component primitives
- shadcn/ui configuration - Pre-configured component variants
- TailwindCSS - Utility-first styling framework
- lucide-react - Icon library

**Data Fetching & State**:
- @tanstack/react-query - Server state management and caching
- wouter - Lightweight client-side routing

**Form Handling**:
- react-hook-form - Form state and validation
- @hookform/resolvers - Validation resolver integration
- zod - Schema validation library
- drizzle-zod - Zod schema generation from database schemas

**Build Tools**:
- Vite - Frontend build tool and dev server
- esbuild - Server-side bundling
- TypeScript - Type safety across the stack

**Real-time Communication**:
- ws (WebSocket library) - Server-side WebSocket implementation
- Native WebSocket API - Client-side real-time connections

**Database (Configured but Inactive)**:
- Drizzle ORM - Type-safe database toolkit
- pg - PostgreSQL client
- drizzle-kit - Database migration tooling

The PostgreSQL/Drizzle setup is configured (schema, config files) but the application currently uses in-memory storage. The database configuration allows future enhancement without architectural changes.

**Development Tools**:
- @replit/vite-plugin-* - Replit-specific development enhancements
- tsx - TypeScript execution for development and scripts

**Utilities**:
- date-fns - Date manipulation and formatting
- nanoid - Unique ID generation
- class-variance-authority - Component variant management
- clsx/tailwind-merge - Conditional className composition