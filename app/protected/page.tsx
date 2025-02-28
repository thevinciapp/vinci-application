import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getSpaces } from "@/app/actions";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  let spaces = await getSpaces();
  
  if (spaces && spaces.length > 0) {
    redirect("/protected/spaces");
  }
}