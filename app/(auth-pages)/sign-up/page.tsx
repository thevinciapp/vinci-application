import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/ui/auth/form-message";
import { SubmitButton } from "@/components/ui/auth/submit-button";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center justify-center">
        <FormMessage message={searchParams} />
      </div>
    );
  }

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
            <SubmitButton 
              formAction={signUpAction} 
              pendingText="Signing up..."
              variant="cyan"
            >
              Sign up
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
