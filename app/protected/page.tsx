import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getSpaces } from "@/app/actions/spaces";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const spacesResponse = await getSpaces();
  
  if (spacesResponse.status === 'success' && spacesResponse.data && spacesResponse.data.length > 0) {
    redirect("/protected/spaces");
  }
}