import { HashRouter, Routes, Route } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import Protected from './pages/Protected';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import CommandCenter from './pages/CommandCenter';
import AuthLayout from './layouts/AuthLayout';
import ProtectedLayout from './layouts/ProtectedLayout';
import { Toaster } from 'vinci-ui';

function App() {
  return (
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
          <Route path="/protected" element={<Protected />} />
          <Route path="/protected/profile" element={<Profile />} />
          <Route path="/protected/reset-password" element={<ResetPassword />} />
        </Route>
        <Route path="/command-center" element={<CommandCenter />} />
      </Routes>
    </HashRouter>
  );
}

export default App;