import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CommandButton, { TypedCommandButton } from "@/components/CommandButton";
import { MessageSquare, Users, Brain, Play } from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, redirect to conversations
  if (user) {
    redirect("/conversations");
  }

  // Otherwise redirect to sign in
  redirect("/sign-in");
}
