"use client";

import { SubmitButton } from "@/src/components/auth/submit-button";
import { Input, Label } from "vinci-ui";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";
import { useAuth } from "@/src/hooks/use-auth";

export default function ForgotPassword() {
  const { resetPassword, isLoading, error } = useAuth();

  return (
    <>
      <form className="flex flex-col w-full">
        <div className="bg-black/20 border border-white/[0.05] backdrop-blur-xl rounded-xl p-6">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-2xl font-medium text-white/90">Reset Password</h1>
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
            {error && (
              <div className="text-red-500 text-sm mb-4">{error}</div>
            )}
            <SubmitButton 
              pendingText="Sending reset link..."
              formAction={async (formData: FormData) => {
                const email = formData.get('email') as string;
                await resetPassword(email);
              }}
              variant="cyan"
              disabled={isLoading}
            >
              {isLoading ? "Sending reset link..." : "Reset Password"}
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
