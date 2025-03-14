"use client";
import Link from "next/link";
import { Button } from "vinci-ui";
import { UserProfileDropdown } from "@/src/components/auth/user-profile-dropdown";
import { useState, useEffect } from "react";
import {User } from "@supabase/supabase-js"

declare global {
  interface Window {
    electron: {
      on: (channel: string, callback: (event: any, data: any) => void) => void;
      invoke: (channel: string) => Promise<any>;
      removeListener: (channel: string, callback: (event: any, data: any) => void) => void;
    };
  }
}

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAppDataUpdate = (event: any, data: { user: User | null }) => {
      setUser(data.user);
      setLoading(false);
    };

    // Listen for app state updates from the main process
    window.electron.on('app-data-updated', handleAppDataUpdate);

    // Initial state check
    window.electron.invoke('get-app-state').then((state: any) => {
      setUser(state.user);
      setLoading(false);
    });

    return () => {
      window.electron.removeListener('app-data-updated', handleAppDataUpdate);
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? (
    <UserProfileDropdown user={user} />
  ) : (
    <div className="flex gap-2">
      <Button size="sm" variant={"ghost"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button size="sm" variant={"ghost"}>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
