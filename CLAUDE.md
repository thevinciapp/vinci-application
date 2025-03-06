Below is an architecture README based on the provided codebase, summarizing the structure, components, and technologies used in the application. This README is designed to give developers an overview of the system's design, key features, and how its parts interact.

---

# Architecture Overview

This document provides an architectural overview of the **Spatial Application**, a Next.js and Supabase-powered web and desktop application designed for managing spaces, conversations, and messages with AI-driven capabilities. The application leverages modern web technologies, a robust backend, and an Electron integration for desktop functionality. It emphasizes scalability, modularity, and maintainability while adhering to best practices like DRY (Don't Repeat Yourself) and SOLID principles.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
  - [Table of Contents](#table-of-contents)
  - [Technology Stack](#technology-stack)
  - [High-Level Architecture](#high-level-architecture)
  - [Directory Structure](#directory-structure)
  - [Key Components](#key-components)
  - [Data Flow](#data-flow)
  - [Caching Strategy](#caching-strategy)
  - [Authentication](#authentication)
  - [File Syncing](#file-syncing)
  - [AI Integration](#ai-integration)
  - [Database Schema](#database-schema)
  - [Development Guidelines](#development-guidelines)

---

## Technology Stack

- **Frontend**: 
  - Next.js (v15.2.0) with App Router for server-side rendering and routing
  - React (v19.0.0) for UI components
  - TailwindCSS (v3.4.17) for styling
  - shadcn/ui for pre-built UI components
  - Lucide React for icons

- **Backend**: 
  - Supabase for authentication, database (PostgreSQL), and real-time features
  - Redis (via `@upstash/redis`) for caching
  - Pinecone for vector embeddings and similarity search

- **Desktop**: 
  - Electron (v34.0.2) for cross-platform desktop support
  - File system integration via `chokidar` and Electron IPC

- **AI**: 
  - OpenAI Embeddings (`@langchain/openai`) for text embeddings
  - Multiple AI providers via `@ai-sdk/*` (e.g., Groq, Anthropic, OpenAI)

- **Other**: 
  - TypeScript (v5.7.2) for type safety
  - Zustand for state management
  - Markdown rendering with `react-markdown` and `marked`

---

## High-Level Architecture

The application follows a layered architecture with clear separation of concerns:

1. **Presentation Layer**: 
   - Next.js pages and React components render the UI.
   - Authentication pages (`/sign-in`, `/sign-up`, `/forgot-password`) and protected routes (`/protected/*`) handle user interaction.

2. **Application Layer**: 
   - Server actions (`app/actions/*`) manage business logic, interacting with Supabase, Redis, and Pinecone.
   - API routes (`app/api/*`) handle chat and authentication callbacks.

3. **Data Layer**: 
   - Supabase PostgreSQL for structured data (spaces, conversations, messages).
   - Redis for caching frequently accessed data.
   - Pinecone for vector storage and similarity search of messages.

4. **Desktop Integration**: 
   - Electron main process handles file system operations and syncs with Pinecone.
   - Preload scripts expose safe APIs to the renderer process.

5. **External Services**: 
   - AI providers for message generation and embeddings.
   - Supabase Auth for user management.

---

## Directory Structure

```
/
├── .cursor/              # Cursor-specific rules
├── app/                  # Next.js application
│   ├── (auth-pages)/     # Authentication pages
│   ├── actions/          # Server actions for business logic
│   ├── api/              # API routes
│   ├── lib/              # Utility libraries (cache, etc.)
│   ├── protected/        # Protected routes
│   └── globals.css       # Global TailwindCSS styles
├── components/           # React components
│   ├── ui/               # Reusable UI components
│   └── *.tsx             # Feature-specific components
├── config/               # Configuration files (chat modes, models)
├── docs/                 # Documentation
├── electron/             # Electron-specific code
├── hooks/                # Custom React hooks
├── lib/                  # Shared utilities and providers
├── public/               # Static assets
├── stores/               # State management (Zustand)
├── supabase/             # Supabase migrations and config
├── types/                # TypeScript type definitions
├── utils/                # Utility functions (Supabase, Pinecone, etc.)
└── *.config.ts           # Configuration files (Next.js, Tailwind, etc.)
```

---

## Key Components

1. **Authentication**:
   - Located in `app/(auth-pages)/`.
   - Uses Supabase Auth with cookie-based sessions via `@supabase/ssr`.

2. **Spaces**:
   - Managed in `app/protected/spaces/`.
   - Server actions in `app/actions/spaces.ts` handle CRUD operations.

3. **Conversations**:
   - Managed in `app/protected/spaces/[spaceId]/conversations/`.
   - Server actions in `app/actions/conversations.ts` handle message creation, retrieval, and deletion.

4. **Chat Interface**:
   - Components in `components/ui/chat/` (e.g., `chat-messages.tsx`, `unified-input.tsx`).
   - Integrates with AI providers via `app/api/chat/route.ts`.

5. **File Sync**:
   - `utils/file-sync.ts` provides a sync engine for Electron and a web client for file uploads.
   - Embeds file content into Pinecone for similarity search.

6. **Caching**:
   - `app/lib/cache.ts` and `app/actions/utils/caching.ts` manage Redis caching.

---

## Data Flow

1. **User Interaction**:
   - User signs in via `/sign-in`, triggering Supabase Auth.
   - Session is stored in cookies and managed by `middleware.ts`.

2. **Space Management**:
   - User creates a space, calling `createSpace` action.
   - Data is stored in Supabase and cached in Redis.

3. **Conversation Flow**:
   - User starts a conversation in a space.
   - Messages are saved to Supabase, embedded in Pinecone, and cached in Redis.
   - AI responses are fetched via `/api/chat`.

4. **File Sync**:
   - In Electron, files are watched and synced to Pinecone.
   - In web, files are uploaded via `FileSyncClient`.

5. **Search**:
   - Message or file search queries Pinecone for similar vectors, filtered by space/conversation.

---

## Caching Strategy

- **Redis**: 
  - Used for caching spaces, conversations, and messages.
  - Keys defined in `CACHE_KEYS` (e.g., `SPACE:spaceId`).
  - TTLs set in `CACHE_TTL` (e.g., conversations: configurable duration).
  - Invalidated on updates (e.g., `invalidateConversationCache`).

- **Purpose**: Reduce database load and improve response times for frequently accessed data.

---

## Authentication

- **Supabase Auth**: 
  - Handles sign-up, sign-in, and password reset.
  - Configured in `utils/supabase/*` with server and client instances.
  - Middleware (`middleware.ts`) updates sessions on each request.

- **Security**: 
  - Row-Level Security (RLS) policies in Supabase ensure data isolation.
  - Cookies secure session persistence across requests.

---

## File Syncing

- **Electron**:
  - `FileSyncEngine` watches directories, processes files, and embeds content in Pinecone.
  - Uses IPC for renderer communication.

- **Web**:
  - `WebFileSync` handles file uploads and embeddings.
  - Unified client (`FileSyncClient`) abstracts environment differences.

- **Pinecone**: Stores file embeddings with metadata for search.

---

## AI Integration

- **Providers**: Supports multiple AI providers (e.g., OpenAI, Groq) via `@ai-sdk/*`.
- **Embeddings**: OpenAI’s `text-embedding-3-large` model embeds messages and files.
- **Chat**: `/api/chat/route.ts` streams AI responses to the client.
- **Similarity Search**: Pinecone queries similar messages/files based on embeddings.

---

## Database Schema

- **Tables** (defined in `supabase/migrations/`):
  - `spaces`: Stores space metadata (id, user_id, name, etc.).
  - `conversations`: Links conversations to spaces (id, space_id, title).
  - `messages`: Stores chat messages (id, conversation_id, content, role).
  - `space_history`: Tracks space actions (id, space_id, action_type).
  - `notifications`: User notifications (id, user_id, type).

- **Indexes**: Full-text search and performance indexes added in migrations.

---

## Development Guidelines

- **Code Style**: See `.cursor/rules/project.mdc` and `CLAUDE.md`.
- **Components**: Use functional components, TailwindCSS, and shadcn/ui.
- **Actions**: Server actions in `app/actions/` for data operations.
- **Error Handling**: Use `ActionResponse` for consistent responses.
- **Accessibility**: Ensure ARIA attributes and keyboard navigation.

---

This architecture supports a scalable, feature-rich application with seamless web and desktop experiences. For detailed implementation, refer to the codebase and inline documentation.