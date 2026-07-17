import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireModule } from "@/components/RequireModule";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Obras from "./pages/Obras";
import Fornecedores from "./pages/Fornecedores";
import Categorias from "./pages/Categorias";
import Solicitacoes from "./pages/Solicitacoes";
import Cotacoes from "./pages/Cotacoes";
import Ordens from "./pages/Ordens";
import OrdemForm from "./pages/OrdemForm";
import Insumos from "./pages/Insumos";
import Contas from "./pages/Contas";
import Fluxo from "./pages/Fluxo";
import Documentos from "./pages/Documentos";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import CentrosCusto from "./pages/CentrosCusto";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PermissionsProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/obras" element={<RequireModule modulo="obras"><Obras /></RequireModule>} />
                <Route path="/fornecedores" element={<RequireModule modulo="fornecedores"><Fornecedores /></RequireModule>} />
                <Route path="/categorias" element={<RequireModule adminOnly><Categorias /></RequireModule>} />
                <Route path="/solicitacoes" element={<RequireModule modulo="solicitacoes"><Solicitacoes /></RequireModule>} />
                <Route path="/cotacoes" element={<RequireModule modulo="cotacoes"><Cotacoes /></RequireModule>} />
                <Route path="/ordens" element={<RequireModule modulo="ordens"><Ordens /></RequireModule>} />
                <Route path="/ordens/nova" element={<RequireModule modulo="ordens"><OrdemForm /></RequireModule>} />
                <Route path="/ordens/:id/editar" element={<RequireModule modulo="ordens"><OrdemForm /></RequireModule>} />
                <Route path="/insumos" element={<RequireModule modulo="insumos"><Insumos /></RequireModule>} />
                <Route path="/contas-pagar" element={<RequireModule modulo="financeiro"><Contas tipo="pagar" /></RequireModule>} />
                <Route path="/contas-receber" element={<RequireModule modulo="financeiro"><Contas tipo="receber" /></RequireModule>} />
                <Route path="/fluxo" element={<RequireModule modulo="financeiro"><Fluxo /></RequireModule>} />
                <Route path="/documentos" element={<Documentos />} />
                <Route path="/centros-custo" element={<RequireModule adminOnly><CentrosCusto /></RequireModule>} />
                <Route path="/usuarios" element={<RequireModule adminOnly><Usuarios /></RequireModule>} />
                <Route path="/configuracoes" element={<RequireModule adminOnly><Configuracoes /></RequireModule>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PermissionsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
}
