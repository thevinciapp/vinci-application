"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast, type ToastVariant } from "vinci-ui";
import { SubmitButton } from "@/src/components/auth/submit-button";
import { Input, Label } from "vinci-ui";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default function Signup() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <form className="flex flex-col w-full">
        <div className="bg-black/20 border border-white/[0.05] backdrop-blur-xl rounded-xl p-6">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-2xl font-medium text-white/90">Sign up</h1>
            <p className="text-sm text-white/60">
              Already have an account?{" "}
              <Link className="text-[#3ecfff]/80 hover:text-[#3ecfff] transition-colors" href="/sign-in">
                Sign in
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
              <Label htmlFor="password" className="text-white/60">Password</Label>
              <Input
                type="password"
                name="password"
                placeholder="Your password"
                minLength={6}
                required
                className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl text-white/90 h-11 px-4 py-2 rounded-lg focus:border-[#3ecfff]/50 focus:ring-0 transition-colors placeholder:text-white/20"
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm mb-4">{error}</div>
            )}
            <SubmitButton 
              pendingText="Signing up..." 
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

                  if (password.length < 6) {
                    setError("Password must be at least 6 characters");
                    return;
                  }

                  const { success, error: apiError, toast: toastData } = await AuthAPI.signUp({ email, password });
                  const variant: ToastVariant = success ? "success" : "destructive";
                  
                  if (success) {
                    toast({
                      title: toastData?.title || "Success",
                      description: toastData?.description || "Successfully signed up",
                      variant
                    });
                    router.push('/sign-in');
                  } else {
                    toast({
                      title: "Error",
                      description: apiError || 'Failed to sign up',
                      variant
                    });
                    setError(apiError || 'Failed to sign up');
                  }
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
                  toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive"
                  });
                  setError(errorMessage);
                  console.error('Sign up error:', error);
                } finally {
                  setIsLoading(false);
                }
              }}
              variant="cyan"
              disabled={isLoading}
            >
              {isLoading ? "Signing up..." : "Sign up"}
            </SubmitButton>
          </div>
        </div>
      </form>
      <div className="mt-6">
        <SmtpMessage />
      </div>
    </>
  );
}
