import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays } from "date-fns";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const [findings, risks, legal, trainings, docs] = await Promise.all([
        supabase.from("findings").select("status, due_date"),
        supabase.from("risks").select("npr").eq("is_active", true),
        supabase.from("legal_requirements").select("expiration_date").eq("is_active", true),
        supabase.from("trainings").select("scheduled_date, is_completed"),
        supabase.from("documents").select("status"),
      ]);
      const now = new Date();
      const in30 = addDays(now, 30);
      const in90 = addDays(now, 90);
      return {
        openFindings: findings.data?.filter(f => f.status !== "cerrado").length ?? 0,
        highRisks: risks.data?.filter(r => (r.npr ?? 0) > 16).length ?? 0,
        expiringLegal: legal.data?.filter(l => {
          if (!l.expiration_date) return false;
          const d = new Date(l.expiration_date);
          return d >= now && d <= in90;
        }).length ?? 0,
        upcomingTrainings: trainings.data?.filter(t => {
          const d = new Date(t.scheduled_date);
          return !t.is_completed && d >= now && d <= in30;
        }).length ?? 0,
        pendingDocs: docs.data?.filter(d => ["draft","pending_approval"].includes(d.status)).length ?? 0,
      };
    },
  });
}
