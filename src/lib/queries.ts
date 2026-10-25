import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.user.id)
      .maybeSingle();
    if (error) throw error;
    return (
      data ?? {
        id: u.user.id,
        full_name: (u.user.user_metadata?.["full_name"] as string) ?? "",
        email: u.user.email ?? null,
        target_role: null,
        experience_level: "beginner",
        preferred_difficulty: "medium",
        default_length: 10,
        timed_mode: false,
        created_at: "",
        updated_at: "",
      }
    );
  },
});

export const sessionsQuery = queryOptions({
  queryKey: ["sessions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data;
  },
});
