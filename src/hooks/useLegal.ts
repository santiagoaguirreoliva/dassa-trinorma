import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO } from "date-fns";

export interface LegalRequirement {
  id: string; code: string; title: string; description?: string;
  category: string; issuing_authority?: string; applicable_area?: string;
  expiration_date?: string; is_active: boolean; created_at: string;
}

export function useLegal() {
  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ["legal_requirements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_requirements").select("*").eq("is_active", true)
        .order("expiration_date", { ascending: true });
      if (error) throw error;
      return data as LegalRequirement[];
    },
  });

  const getDaysLeft = (expiry?: string) =>
    expiry ? differenceInDays(parseISO(expiry), new Date()) : null;

  const getStatus = (req: LegalRequirement) => {
    const days = getDaysLeft(req.expiration_date);
    if (days === null) return { label: "Sin vencimiento", color: "#64748b", bg: "#f1f5f9" };
    if (days < 0)      return { label: "Vencido",        color: "#dc2626", bg: "#fee2e2" };
    if (days <= 30)    return { label: "Vence pronto",   color: "#dc2626", bg: "#fee2e2" };
    if (days <= 90)    return { label: "Por vencer",     color: "#d97706", bg: "#fef3c7" };
    return                    { label: "Vigente",        color: "#059669", bg: "#d1fae5" };
  };

  return { requirements, isLoading, getDaysLeft, getStatus };
}
