import { HashRouter, Routes, Route } from 'react-router-dom';
import SignIn from '@/pages/SignIn';
import ForgotPassword from '@/pages/ForgotPassword';
import Profile from '@/pages/Profile';
import ResetPassword from '@/pages/ResetPassword';
import CommandCenter from '@/pages/CommandCenter';
import AuthLayout from '@/layouts/AuthLayout';
import ProtectedLayout from '@/layouts/ProtectedLayout';
import { Toaster } from '@/components/ui/toaster';
import SignUp from './pages/SignUp';
import { ProtectedPage } from '@/pages/Protected';
import { MainStateProvider } from './context/MainStateContext';

function App() {
  return (
    <MainStateProvider>
      <HashRouter>
        <Toaster />
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
          <Route path="/" element={<SignIn />} /> {/* Default route */}
          <Route element={<ProtectedLayout />}>
            <Route path="/protected" element={<ProtectedPage />} />
            <Route path="/protected/profile" element={<Profile />} />
            <Route path="/protected/reset-password" element={<ResetPassword />} />
          </Route>
          <Route path="/command-center">
            <Route path="unified" element={<CommandCenter />} />
            <Route path=":type" element={<CommandCenter />} />
          </Route>
        </Routes>
      </HashRouter>
    </MainStateProvider>
  );
}

export default App;