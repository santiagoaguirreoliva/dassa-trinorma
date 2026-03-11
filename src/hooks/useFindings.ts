import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FindingType = "nc_real" | "nc_potencial" | "mejora";
export type FindingStatus = "abierto" | "analisis" | "plan_accion" | "en_ejecucion" | "verificacion" | "cerrado";

export interface Finding {
  id: string; code: string; title: string; description: string;
  finding_type: FindingType; status: FindingStatus; origin: string; area: string;
  due_date?: string; reported_by?: string; assigned_to?: string;
  immediate_action?: string; cause_analysis_type?: string; cause_analysis_content?: string;
  financial_impact?: number; efficacy_verified: boolean;
  verification_date_30?: string; verification_date_60?: string;
  closed_at?: string; created_at: string; updated_at: string;
}

export function useFindings() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["findings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("findings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Finding[];
    },
  });

  const createFinding = useMutation({
    mutationFn: async (data: Omit<Finding, "id"|"code"|"efficacy_verified"|"created_at"|"updated_at">) => {
      const { data: f, error } = await supabase
        .from("findings").insert({ ...data, reported_by: profile?.id }).select().single();
      if (error) throw error;
      return f;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["findings"] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FindingStatus }) => {
      const { error } = await supabase.from("findings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["findings"] }),
  });

  const stats = {
    open: findings.filter(f => f.status !== "cerrado").length,
    overdue: findings.filter(f => f.status !== "cerrado" && f.due_date && new Date(f.due_date) < new Date()).length,
    closed: findings.filter(f => f.status === "cerrado").length,
    byStatus: Object.fromEntries(
      ["abierto","analisis","plan_accion","en_ejecucion","verificacion","cerrado"].map(
        s => [s, findings.filter(f => f.status === s).length]
      )
    ),
  };

  return { findings, isLoading, createFinding, updateStatus, stats };
}
