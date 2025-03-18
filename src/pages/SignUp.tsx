import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

export default function SignUp() {
  const { signUp, isLoading, error } = useAuth();
  
  return (
    <div className="flex flex-col w-full">
      <h1>Sign Up Page</h1>
      <Link to="/sign-in">Sign in</Link>
    </div>
  );
}