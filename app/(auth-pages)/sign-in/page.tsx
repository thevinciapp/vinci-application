import { signInAction } from "@/app/actions/auth";
import { FormMessage, Message } from "@/components/ui/auth/form-message";
import { SubmitButton } from "@/components/ui/auth/submit-button";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
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
          <SubmitButton 
            pendingText="Signing In..." 
            formAction={signInAction}
            variant="cyan"
          >
            Sign in
          </SubmitButton>
          <FormMessage message={searchParams} />
        </div>
      </div>
    </form>
  );
}
