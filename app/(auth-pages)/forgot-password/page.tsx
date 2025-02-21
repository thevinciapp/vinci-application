import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
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
            <SubmitButton 
              formAction={forgotPasswordAction} 
              pendingText="Sending reset link..."
              variant="cyan"
            >
              Reset Password
            </SubmitButton>
            <FormMessage message={searchParams} />
          </div>
        </div>
      </form>
      <div className="mt-6">
        <SmtpMessage />
      </div>
    </>
  );
}
