import { supabase } from "@/lib/supabase";

export async function getCurrentCompanyId(): Promise<string | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data?.company_id) {
    return null;
  }

  return data.company_id;
}
