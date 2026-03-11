import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Risk {
  id: string; code: string; hazard_aspect: string; risk_impact: string;
  probability: number; severity: number; detection: number; npr: number;
  risk_type: string; process_area: string; control_description?: string;
  potential_cause?: string; is_active: boolean; created_at: string;
}

export function useRisks() {
  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["risks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risks").select("*").eq("is_active", true).order("npr", { ascending: false });
      if (error) throw error;
      return data as Risk[];
    },
  });

  const riskLevel = (npr: number) => {
    if (npr > 16) return { label: "Significativo", color: "#ef4444", bg: "#fee2e2" };
    if (npr > 8)  return { label: "Moderado",      color: "#f59e0b", bg: "#fef3c7" };
    return              { label: "Aceptable",      color: "#10b981", bg: "#d1fae5" };
  };

  return { risks, isLoading, riskLevel,
    stats: {
      significant: risks.filter(r => r.npr > 16).length,
      moderate: risks.filter(r => r.npr > 8 && r.npr <= 16).length,
      acceptable: risks.filter(r => r.npr <= 8).length,
    }
  };
}
