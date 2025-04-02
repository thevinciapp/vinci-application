import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SubmitButton } from '@/components/auth/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, isLoading, error } = useAuth();
  const [loadingData, setLoadingData] = useState(false);
  const { toast } = useToast();
  
  return (
    <div className="flex items-center justify-center w-full">
      <form className="w-full max-w-[480px]">
        <div className="bg-black/20 border border-white/[0.05] backdrop-blur-xl rounded-xl p-8">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-2xl font-medium text-white/90">Sign up</h1>
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
              <Label htmlFor="password" className="text-white/60">Password</Label>
              <Input
                type="password"
                name="password"
                placeholder="Create a password"
                required
                className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl text-white/90 h-11 px-4 py-2 rounded-lg focus:border-[#3ecfff]/50 focus:ring-0 transition-colors placeholder:text-white/20"
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm mb-4">{error}</div>
            )}
            <SubmitButton 
              pendingText="Creating account..." 
              formAction={async (formData: FormData) => {
                const email = formData.get('email') as string;
                const password = formData.get('password') as string;
                setLoadingData(true);
                const success = await signUp({ email, password });
                setLoadingData(false);
                
                if (success) {
                  navigate('/protected');
                }
              }}
              variant="cyan"
              disabled={isLoading || loadingData}
            >
              {isLoading || loadingData ? "Creating account..." : "Sign up"}
            </SubmitButton>
            <div className="mt-4 text-center">
              <span className="text-white/60 text-sm">Already have an account? </span>
              <Link
                className="text-sm text-[#3ecfff]/60 hover:text-[#3ecfff]/80 transition-colors"
                to="/sign-in"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
} 