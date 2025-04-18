import { useNavigate , Link } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '@/shared/components/input';
import { Label } from '@/shared/components/label';
import { useAuth } from '@/features/auth/use-auth';
import { SubmitButton } from '@/features/auth/ui/submit-button';

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn, isLoading, error } = useAuth();
  const [loadingData, setLoadingData] = useState(false);

  return (
    <div className="flex items-center justify-center w-full">
      <form className="w-full max-w-[480px]">
        <div className="bg-black/20 border border-white/[0.05] backdrop-blur-xl rounded-xl p-8">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-2xl font-medium text-white/90">Sign in</h1>
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
              pendingText="Signing in..."
              formAction={async (formData: FormData) => {
                const email = formData.get('email') as string;
                const password = formData.get('password') as string;
                setLoadingData(true);
                const success = await signIn({ email, password });
                setLoadingData(false);

                if (success) {
                  navigate('/protected');
                }
              }}
              variant="cyan"
              disabled={isLoading || loadingData}
            >
              {isLoading || loadingData ? "Signing in..." : "Sign in"}
            </SubmitButton>
            <div className="mt-4 text-center">
              <span className="text-white/60 text-sm">Don&apos;t have an account? </span>
              <Link
                className="text-sm text-[#3ecfff]/60 hover:text-[#3ecfff]/80 transition-colors"
                to="/sign-up"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}