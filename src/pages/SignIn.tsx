import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SubmitButton } from '@/components/auth/submit-button';
import { Input, Label, toast } from 'vinci-ui';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useRendererStore } from '@/store/renderer';

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn, isLoading, error } = useAuth();
  const rendererStore = useRendererStore();
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
                const success = await signIn({ email, password });
                
                if (success) {
                  try {
                    setLoadingData(true);
                    const dataLoaded = await rendererStore.fetchAppState();
                    if (dataLoaded) {
                      navigate('/protected');
                    } else {
                      console.error("Failed to load application data after login");
                      toast({
                        title: "Error",
                        description: "Successfully signed in, but failed to load your data. Please try again.",
                        variant: "destructive"
                      });
                    }
                  } catch (error) {
                    console.error("Error loading application data:", error);
                    toast({
                      title: "Error",
                      description: "Failed to load application data after login. Please try again.",
                      variant: "destructive"
                    });
                  } finally {
                    setLoadingData(false);
                  }
                }
              }}
              variant="cyan"
              disabled={isLoading || loadingData}
            >
              {isLoading || loadingData ? "Signing in..." : "Sign in"}
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}