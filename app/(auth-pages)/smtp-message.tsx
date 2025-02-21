import { ArrowUpRight, InfoIcon } from "lucide-react";
import Link from "next/link";

export function SmtpMessage() {
  return (
    <div className="bg-black/20 border border-white/[0.05] backdrop-blur-xl rounded-lg px-5 py-4 flex gap-4">
      <InfoIcon size={16} className="mt-0.5 text-white/60" />
      <div className="flex flex-col gap-1">
        <small className="text-sm text-white/60">
          <strong className="text-white/80">Note:</strong> Emails are rate limited. Enable Custom SMTP to
          increase the rate limit.
        </small>
        <div>
          <Link
            href="https://supabase.com/docs/guides/auth/auth-smtp"
            target="_blank"
            className="text-[#3ecfff]/60 hover:text-[#3ecfff]/80 transition-colors flex items-center text-sm gap-1"
          >
            Learn more <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
