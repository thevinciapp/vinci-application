# CLAUDE.md - Vinci Application Guidelines

## Build Commands
- `npm run dev` - Start development environment (Electron + Next.js)
- `npm run next:dev` - Start Next.js dev server only
- `npm run electron:dev` - Start Electron dev process only 
- `npm run next:build` - Build Next.js app
- `npm run electron:build` - Build Electron app
- `npm run electron:build_watch` - Build Electron with watch mode

## Code Style Guidelines
- **TypeScript**: Strict typing required with clear interfaces/types
- **React Components**: Function components with hooks (no class components)
- **Imports**: Order - React/Next.js, external libraries, internal modules, styles 
- **Naming**: camelCase for variables/functions, PascalCase for components/interfaces
- **Error Handling**: Use try/catch with appropriate toast notifications
- **IPC Communication**: Use events from `src/core/ipc/constants.ts`
- **State Management**: Use hooks, follow the data flow architecture in docs
- **File Structure**: Place components in appropriate directories based on function

## Component Architecture
- Use custom hooks for IPC communication
- Clean up event listeners in useEffect returns
- Handle loading states consistently 
- Follow the component data flow guide in the docs

## Always include type safety