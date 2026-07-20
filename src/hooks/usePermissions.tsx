import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Modulo =
  | "dashboard" | "solicitacoes" | "cotacoes" | "ordens" | "financeiro"
  | "obras" | "fornecedores" | "insumos" | "usuarios" | "relatorios";
export const ALL_MODULOS: Modulo[] = [
  "dashboard", "solicitacoes", "cotacoes", "ordens", "financeiro",
  "obras", "fornecedores", "insumos", "usuarios", "relatorios",
];

export type PerfilPreset = "administrador" | "compras" | "financeiro" | "engenharia" | "personalizado";
export const PERFIS_PRESET: Record<Exclude<PerfilPreset, "personalizado">, { label: string; role: "admin" | "usuario"; modulos: Modulo[] }> = {
  administrador: { label: "Administrador", role: "admin", modulos: ALL_MODULOS },
  compras: { label: "Compras", role: "usuario", modulos: ["dashboard", "solicitacoes", "cotacoes", "ordens", "fornecedores", "insumos"] },
  financeiro: { label: "Financeiro", role: "usuario", modulos: ["dashboard", "financeiro", "ordens", "relatorios"] },
  engenharia: { label: "Engenharia", role: "usuario", modulos: ["dashboard", "obras", "solicitacoes", "insumos", "relatorios"] },
};

type Ctx = { isAdmin: boolean; modulos: Modulo[]; loading: boolean; can: (m: Modulo) => boolean; refresh: () => Promise<void> };
const C = createContext<Ctx>({ isAdmin: false, modulos: [], loading: true, can: () => false, refresh: async () => {} });

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setIsAdmin(false); setModulos([]); setLoading(false); return; }
    setLoading(true);
    const [{ data: roles }, { data: mods }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("user_modulos").select("modulo").eq("user_id", user.id),
    ]);
    const admin = (roles || []).some((r: any) => r.role === "admin");
    setIsAdmin(admin);
    setModulos((mods || []).map((m: any) => m.modulo as Modulo));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const can = (m: Modulo) => isAdmin || modulos.includes(m);
  return <C.Provider value={{ isAdmin, modulos, loading, can, refresh: load }}>{children}</C.Provider>;
};

export const usePermissions = () => useContext(C);
