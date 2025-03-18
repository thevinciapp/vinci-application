# Guide: Migrating from Next.js App Router with TypeScript to `electron-vite` with Standard React

This guide provides a comprehensive, step-by-step process to migrate your Electron application from using Next.js (with the App Router and TypeScript) to `electron-vite` with standard React. By switching to `electron-vite`, you’ll leverage Vite’s fast development server and Hot Module Replacement (HMR), replacing Next.js’s server-oriented features with a client-side React setup using React Router for navigation.

Your current application uses Next.js App Router with TypeScript, integrated into an Electron environment, as shown in the provided codebase. This migration will remove Next.js, replacing it with a standard React setup while maintaining Electron functionality and TypeScript support.

---

## Prerequisites

- **Familiarity**: Basic understanding of Electron, Next.js, React, and TypeScript.
- **Current Setup**: A working Electron app using Next.js with TypeScript, as per your provided codebase.
- **Environment**: Node.js 20.x and Electron 29.x or compatible versions (based on your `package.json` using Electron 34.0.2).

---

## Step-by-Step Migration Guide

### Step 1: Install `electron-vite` and Required Dependencies

1. **Install `electron-vite`**:
   - `electron-vite` integrates Vite with Electron, providing fast builds and HMR.
   - Run the following command to install it as a development dependency:
     ```bash
     npm install electron-vite --save-dev
     ```

2. **Install `react-router-dom`**:
   - Since Next.js handles routing via the App Router, you’ll need `react-router-dom` for client-side routing in standard React.
   - Install it:
     ```bash
     npm install react-router-dom
     ```

3. **Verify Existing Dependencies**:
   - Your `package.json` already includes `react`, `react-dom`, `electron`, and TypeScript dependencies, so no additional core packages are needed yet.

---

### Step 2: Reconfigure Project Structure

Next.js uses a specific directory structure (`app/`, `pages/`, etc.), while `electron-vite` with Vite expects a standard web app structure. Adjust your project accordingly.

1. **Create `index.html`**:
   - Vite requires an `index.html` file as the entry point for the renderer process.
   - Place it in the project root:
     ```html
     <!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Vinci App</title>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="/src/main.tsx"></script>
     </body>
     </html>
     ```

2. **Set Up React Entry Point**:
   - Create `src/main.tsx` as the entry point for your React app:
     ```tsx
     import React from 'react';
     import ReactDOM from 'react-dom/client';
     import App from './App';
     import './styles/globals.css'; // Import global styles

     ReactDOM.createRoot(document.getElementById('root')!).render(
       <React.StrictMode>
         <App />
       </React.StrictMode>
     );
     ```
   - This mounts your React app into the `root` div from `index.html`.

3. **Move and Restructure Renderer Code**:
   - **Pages**: Move page components from `app/` to `src/pages/`:
     - `app/(auth-pages)/sign-in/page.tsx` → `src/pages/SignIn.tsx`
     - `app/(auth-pages)/sign-up/page.tsx` → `src/pages/SignUp.tsx`
     - `app/(auth-pages)/forgot-password/page.tsx` → `src/pages/ForgotPassword.tsx`
     - `app/protected/page.tsx` → `src/pages/Protected.tsx`
     - `app/protected/profile/page.tsx` → `src/pages/Profile.tsx`
     - `app/protected/reset-password/page.tsx` → `src/pages/ResetPassword.tsx`
     - `app/command-center/page.tsx` → `src/pages/CommandCenter.tsx`
   - **Layouts**: Move layouts to `src/layouts/`:
     - `app/(auth-pages)/layout.tsx` → `src/layouts/AuthLayout.tsx`
     - `app/protected/layout.tsx` → `src/layouts/ProtectedLayout.tsx`
   - **Global Styles**: Move `app/globals.css` to `src/styles/globals.css`.
   - **Other Components**: Your existing `src/components/`, `src/hooks/`, etc., can remain as is, assuming paths are updated.

4. **Clean Up Next.js Artifacts**:
   - Remove `app/layout.tsx`, `app/page.tsx`, and other Next.js-specific files no longer needed.

---

### Step 3: Replace Next.js Routing with React Router

Next.js provides file-based routing, which you’ll replace with `react-router-dom`.

1. **Create `src/App.tsx`**:
   - Define your routes using React Router:
     ```tsx
     import { BrowserRouter, Routes, Route } from 'react-router-dom';
     import SignIn from './pages/SignIn';
     import SignUp from './pages/SignUp';
     import ForgotPassword from './pages/ForgotPassword';
     import Protected from './pages/Protected';
     import Profile from './pages/Profile';
     import ResetPassword from './pages/ResetPassword';
     import CommandCenter from './pages/CommandCenter';
     import AuthLayout from './layouts/AuthLayout';
     import ProtectedLayout from './layouts/ProtectedLayout';
     import { Toaster } from 'vinci-ui'; // From app/layout.tsx

     function App() {
       return (
         <BrowserRouter>
           <Toaster /> {/* Global toaster from vinci-ui */}
           <Routes>
             <Route element={<AuthLayout />}>
               <Route path="/sign-in" element={<SignIn />} />
               <Route path="/sign-up" element={<SignUp />} />
               <Route path="/forgot-password" element={<ForgotPassword />} />
             </Route>
             <Route path="/" element={<SignIn />} /> {/* Default route */}
             <Route element={<ProtectedLayout />}>
               <Route path="/protected" element={<Protected />} />
               <Route path="/protected/profile" element={<Profile />} />
               <Route path="/protected/reset-password" element={<ResetPassword />} />
             </Route>
             <Route path="/command-center" element={<CommandCenter />} />
           </Routes>
         </BrowserRouter>
       );
     }

     export default App;
     ```

2. **Update Page Components**:
   - Remove Next.js-specific imports like `useRouter` from `next/navigation` and `Link` from `next/link`.
   - Replace with React Router equivalents:
     - `useRouter` → `useNavigate` from `react-router-dom`.
     - `Link` → `Link` from `react-router-dom`.
   - **Example**: Update `src/pages/SignIn.tsx`:
     ```tsx
     "use client";

     import { useNavigate } from 'react-router-dom';
     import { SubmitButton } from '@/src/components/auth/submit-button';
     import { Input, Label } from 'vinci-ui';
     import { Link } from 'react-router-dom';
     import { useAuth } from '@/src/hooks/use-auth';

     export default function SignIn() {
       const navigate = useNavigate();
       const { signIn, isLoading, error } = useAuth();

       return (
         <form className="flex flex-col w-full">
           <div className="bg-black/20 border border-white/[0.05] backdrop-blur-xl rounded-xl p-6">
             <div className="flex flex-col gap-2 mb-8">
               <h1 className="text-2xl font-medium text-white/90">Sign in</h1>
               <p className="text-sm text-white/60">
                 Don't have an account?{" "}
                 <Link className="text-[#3ecfff]/80 hover:text-[#3ecfff] transition-colors" to="/sign-up">
                   Sign up
                 </Link>
               </p>
             </div>
             <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-2">
                 <Label htmlFor="email" className="text-white/60">Email</Label>
                 <Input 
                   name="email" 
                   placeholder="you@example.com" 
                   required 
                   className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl text-white/90 h-11 px-4 py-2 rounded-lg focus:border-[#3ecfff]/50 focus:ring-0 transition-colors placeholder:text-white/20"
                 />
               </div>
               <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-center">
                   <Label htmlFor="password" className="text-white/60">Password</Label>
                   <Link
                     className="text-xs text-[#3ecfff]/60 hover:text-[#3ecfff]/80 transition-colors"
                     to="/forgot-password"
                   >
                     Forgot Password?
                   </Link>
                 </div>
                 <Input
                   type="password"
                   name="password"
                   placeholder="Your password"
                   required
                   className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl text-white/90 h-11 px-4 py-2 rounded-lg focus:border-[#3ecfff]/50 focus:ring-0 transition-colors placeholder:text-white/20"
                 />
               </div>
               {error && (
                 <div className="text-red-500 text-sm mb-4">{error}</div>
               )}
               <SubmitButton 
                 pendingText="Signing In..." 
                 formAction={async (formData: FormData) => {
                   const email = formData.get('email') as string;
                   const password = formData.get('password') as string;
                   const success = await signIn({ email, password });
                   if (success) {
                     navigate('/protected');
                   }
                 }}
                 variant="cyan"
                 disabled={isLoading}
               >
                 {isLoading ? "Signing in..." : "Sign in"}
               </SubmitButton>
             </div>
           </div>
         </form>
       );
     }
     ```
   - Apply similar changes to other pages (e.g., `SignUp.tsx`, `Profile.tsx`).

3. **Update Layouts**:
   - Convert `AuthLayout.tsx` and `ProtectedLayout.tsx` to client components (remove server component nature):
     - **Example**: `src/layouts/AuthLayout.tsx`:
       ```tsx
       import { ReactNode } from 'react';

       export default function AuthLayout({ children }: { children: ReactNode }) {
         return (
           <div className="min-h-screen w-full flex items-center justify-center bg-black text-white relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-screen pointer-events-none">
               <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-[#3ecfff]/[0.015] blur-[120px] rounded-full" />
               <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-[#D4966A]/[0.015] blur-[100px] rounded-full" />
               <div className="absolute bottom-[10%] left-[30%] w-[600px] h-[600px] bg-[#3ecfff]/[0.01] blur-[130px] rounded-full" />
             </div>
             <div className="relative z-10 w-full max-w-md p-6">
               {children}
             </div>
           </div>
         );
       }
       ```

---

### Step 4: Configure `electron-vite`

`electron-vite` requires a configuration file to specify how to build the main, preload, and renderer processes.

1. **Create `electron.vite.config.ts`**:
   - In the project root, create this file to configure `electron-vite`:
     ```ts
     import { defineConfig } from 'vite';
     import react from '@vitejs/plugin-react';
     import path from 'path';

     export default {
       main: {
         build: {
           lib: {
             entry: path.resolve(__dirname, 'electron/main.ts'),
             formats: ['cjs'],
           },
           outDir: 'out/main',
         },
       },
       preload: {
         build: {
           lib: {
             entry: path.resolve(__dirname, 'electron/preload.ts'),
             formats: ['cjs'],
           },
           outDir: 'out/preload',
         },
       },
       renderer: defineConfig({
         root: __dirname,
         build: {
           outDir: 'out/renderer',
         },
         plugins: [react()],
       }),
     };
     ```
   - This configures:
     - **Main Process**: Builds `electron/main.ts` to `out/main/index.js`.
     - **Preload Script**: Builds `electron/preload.ts` to `out/preload/index.js`.
     - **Renderer Process**: Builds the React app from `index.html` to `out/renderer/`.

2. **Update `electron/main.ts`**:
   - Adjust the main process to load the Vite-built renderer:
     ```ts
     import { app, BrowserWindow } from 'electron';
     import path from 'path';

     function createWindow() {
       const win = new BrowserWindow({
         width: 800,
         height: 600,
         webPreferences: {
           preload: path.join(__dirname, '../preload/index.js'),
           nodeIntegration: false,
           contextIsolation: true,
         },
       });

       if (process.env.NODE_ENV === 'development') {
         win.loadURL('http://localhost:5173'); // Vite dev server port
       } else {
         win.loadFile(path.join(__dirname, '../renderer/index.html'));
       }
     }

     app.whenReady().then(() => {
       createWindow();
       app.on('activate', () => {
         if (BrowserWindow.getAllWindows().length === 0) createWindow();
       });
     });

     app.on('window-all-closed', () => {
       if (process.platform !== 'darwin') app.quit();
     });
     ```
   - This loads the Vite dev server in development and the built `index.html` in production.

---

### Step 5: Update `package.json` Scripts

Replace Next.js-specific scripts with `electron-vite` commands.

1. **Modify `package.json`**:
   ```json
   "scripts": {
     "dev": "electron-vite dev",
     "build": "electron-vite build",
     "preview": "electron-vite preview",
     "start": "electron ./out/main/index.js"
   }
   ```

2. **Remove Unused Dependencies**:
   - Uninstall Next.js and related packages:
     ```bash
     npm uninstall next @supabase/auth-helpers-nextjs @supabase/ssr
     ```
   - Keep `react`, `react-dom`, `electron`, and other dependencies used by your app.

---

### Step 6: Handle Fonts and Styles

Next.js provided font optimization via `next/font`. With Vite, you’ll need to manage fonts manually.

1. **Move Fonts**:
   - Your `app/layout.tsx` uses `Geist` and `Geist_Mono` from `next/font/google`. Instead, import them via CSS or a CDN.
   - Update `src/styles/globals.css`:
     ```css
     @import 'tailwindcss';
     @import 'vinci-ui/styles.css';
     @import url('https://fonts.googleapis.com/css2?family=Geist+Sans:wght@400;700&family=Geist+Mono:wght@400&display=swap');

     :root {
       --font-geist-sans: 'Geist Sans', sans-serif;
       --font-geist-mono: 'Geist Mono', monospace;
     }

     body {
       font-family: var(--font-geist-sans);
     }
     ```

2. **Ensure Tailwind Works**:
   - Update `tailwind.config.js` to point to the new `src/` structure if needed:
     ```js
     module.exports = {
       content: [
         './src/**/*.{ts,tsx}',
       ],
       theme: {
         extend: {},
       },
       plugins: [],
     };
     ```

---

### Step 7: Test and Debug

1. **Run Development Mode**:
   ```bash
   npm run dev
   ```
   - This starts the Vite dev server and Electron, loading `http://localhost:5173`.

2. **Verify Functionality**:
   - **Electron Window**: Ensure the window opens and loads the React app.
   - **Routing**: Test navigation (e.g., `/sign-in` to `/protected`).
   - **IPC**: Confirm hooks like `useAuth` and `useUser` still work via IPC.
   - **Styles**: Check that Tailwind and global styles apply correctly.

3. **Build and Test Production**:
   ```bash
   npm run build
   npm run start
   ```
   - Ensure the built app runs without errors.

4. **Debug Issues**:
   - Fix path errors (e.g., adjust import aliases in `tsconfig.json` if needed).
   - Update any remaining Next.js-specific code (e.g., remove `"use client"` directives if unnecessary).

---

### Additional Considerations

- **TypeScript Configuration**:
  - Update `tsconfig.json` to remove Next.js-specific settings:
    ```json
    {
      "compilerOptions": {
        "target": "es5",
        "lib": ["dom", "dom.iterable", "esnext"],
        "allowJs": true,
        "skipLibCheck": true,
        "strict": true,
        "forceConsistentCasingInFileNames": true,
        "esModuleInterop": true,
        "module": "esnext",
        "moduleResolution": "node",
        "resolveJsonModule": true,
        "isolatedModules": true,
        "jsx": "react-jsx",
        "incremental": true,
        "baseUrl": ".",
        "paths": {
          "@/*": ["./src/*"]
        }
      },
      "include": ["src/**/*", "electron/**/*", "types/**/*.d.ts"],
      "exclude": ["node_modules", ".next"]
    }
    ```

- **Remove Next.js Configs**:
  - Delete `next.config.ts`, `.next/`, and other Next.js-generated files.

- **IPC and Hooks**:
  - Your app uses IPC heavily (e.g., `useAuth`, `useUser`). These should remain functional as they rely on Electron’s main process, not Next.js.

---

## Final Notes

By following this guide, your Electron app will transition from Next.js to `electron-vite` with standard React, maintaining its core functionality while benefiting from Vite’s speed and simplicity. Test thoroughly after each step to catch issues early, especially around routing and IPC communication. Your app’s structure will now resemble a standard React project, making it easier to maintain and extend outside the Next.js ecosystem.