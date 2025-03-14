"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "vinci-ui";
import { UserProfileDropdown } from "@/src/components/auth/user-profile-dropdown";
import { User } from "@supabase/supabase-js";
import { AppStateEvents } from "@/src/core/ipc/constants";
import { IpcRendererEvent } from 'electron';

declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => void;
      off: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => void;
    };
  }
}

type AppState = {
  user: User | null;
  isLoading?: boolean;
  [key: string]: any;
};

type IpcResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAppDataUpdate = (event: IpcRendererEvent, response: IpcResponse<AppState>) => {
      if (response.success && response.data) {
        setUser(response.data.user);
        setLoading(false);
      }
    };

    window.electron.on(AppStateEvents.STATE_UPDATED, handleAppDataUpdate);

    // Initial state check
    window.electron.invoke(AppStateEvents.GET_STATE).then((response: IpcResponse<AppState>) => {
      if (response.success && response.data) {
        setUser(response.data.user);
        setLoading(false);
      }
    });

    return () => {
      window.electron.off(AppStateEvents.STATE_UPDATED, handleAppDataUpdate);
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
