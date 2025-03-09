"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { SubmitButton } from "@/components/ui/auth/submit-button";
import { Input, Label } from "vinci-ui";
import Link from "next/link";
import { AuthAPI } from "@/lib/api-client";

export default function Login() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <form className="flex flex-col w-full">
      <div className="bg-black/20 border border-white/[0.05] backdrop-blur-xl rounded-xl p-6">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-2xl font-medium text-white/90">Sign in</h1>
          <p className="text-sm text-white/60">
            Don't have an account?{" "}
            <Link className="text-[#3ecfff]/80 hover:text-[#3ecfff] transition-colors" href="/sign-up">
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
                href="/forgot-password"
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
              try {
                setError("");
                setIsLoading(true);

                const email = formData.get('email') as string;
                const password = formData.get('password') as string;

                if (!email || !password) {
                  setError("Please fill in all fields");
                  return;
                }

                const response = await AuthAPI.signIn({ email, password });
                
                if (response.success) {
                  toast({
                    title: "Success",
                    description: "Successfully signed in",
                    variant: "success"
                  });
                  
                  // Share auth token with Electron if in desktop context
                  if (typeof window !== 'undefined' && window.electronAPI) {
                    try {
                      // Get session access token from response data
                      const session = response.data as { session?: { access_token: string } };
                      if (session?.session?.access_token) {
                        // Send token to Electron main process
                        const success = await window.electronAPI.setAuthToken(session.session.access_token);
                        if (success) {
                          console.log('Auth token and cookies passed to Electron successfully');
                        } else {
                          console.error('Failed to set up authentication in Electron');
                        }
                      }
                    } catch (error) {
                      console.error('Failed to pass auth token to Electron:', error);
                    }
                  }
                  
                  router.push('/protected');
                } else {
                  setError(response.error || 'Failed to sign in');
                }
              } catch (error) {
                setError('An unexpected error occurred');
                console.error('Sign in error:', error);
              } finally {
                setIsLoading(false);
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
