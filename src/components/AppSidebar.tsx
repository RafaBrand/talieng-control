import { NavLink, useLocation } from "react-router-dom";
import { Building2, LayoutDashboard, Users, HardHat, Tags, FileText, ShoppingCart, ClipboardList, Wallet, FolderArchive, LogOut, Calculator, Shield, Settings, Package, Layers } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, Modulo } from "@/hooks/usePermissions";

type Item = { title: string; url: string; icon: any; modulo?: Modulo; adminOnly?: boolean };

const groups: { label: string; items: Item[] }[] = [
  { label: "Principal", items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }] },
  { label: "Cadastros", items: [
    { title: "Obras", url: "/obras", icon: HardHat, modulo: "obras" },
    { title: "Fornecedores", url: "/fornecedores", icon: Users, modulo: "fornecedores" },
    { title: "Categorias", url: "/categorias", icon: Tags, adminOnly: true },
    { title: "Insumos", url: "/insumos", icon: Package, modulo: "insumos" },
  ]},
  { label: "Compras", items: [
    { title: "Solicitações", url: "/solicitacoes", icon: ClipboardList, modulo: "solicitacoes" },
    { title: "Cotações", url: "/cotacoes", icon: Calculator, modulo: "cotacoes" },
    { title: "Ordens de Compra", url: "/ordens", icon: ShoppingCart, modulo: "ordens" },
  ]},
  { label: "Financeiro", items: [
    { title: "Contas a Pagar", url: "/contas-pagar", icon: Wallet, modulo: "financeiro" },
    { title: "Contas a Receber", url: "/contas-receber", icon: Wallet, modulo: "financeiro" },
    { title: "Fluxo de Caixa", url: "/fluxo", icon: FileText, modulo: "financeiro" },
  ]},
  { label: "Documentos", items: [{ title: "Arquivos", url: "/documentos", icon: FolderArchive }] },
  { label: "Administração", items: [
    { title: "Centros de Custo", url: "/centros-custo", icon: Layers, adminOnly: true },
    { title: "Usuários", url: "/usuarios", icon: Shield, adminOnly: true },
    { title: "Configurações", url: "/configuracoes", icon: Settings, adminOnly: true },
  ]},
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { isAdmin, can } = usePermissions();

  const visible = groups
    .map(g => ({ ...g, items: g.items.filter(it => (it.adminOnly ? isAdmin : (it.modulo ? can(it.modulo) : true))) }))
    .filter(g => g.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elegant flex-shrink-0">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-sidebar-foreground">Talieng Control</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {visible.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <NavLink to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenuButton onClick={signOut}>
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
