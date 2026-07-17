import { Navigate } from "react-router-dom";
import { usePermissions, Modulo } from "@/hooks/usePermissions";

export const RequireModule = ({ modulo, adminOnly, children }: { modulo?: Modulo; adminOnly?: boolean; children: React.ReactNode }) => {
  const { can, isAdmin, loading } = usePermissions();
  if (loading) return <div className="p-8 text-muted-foreground">Carregando permissões...</div>;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (modulo && !can(modulo)) return <Navigate to="/" replace />;
  return <>{children}</>;
};
