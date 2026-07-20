import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { ALL_MODULOS, Modulo, PERFIS_PRESET, PerfilPreset, usePermissions } from "@/hooks/usePermissions";

const MOD_LABEL: Record<Modulo, string> = {
  dashboard: "Dashboard", solicitacoes: "Solicitações", cotacoes: "Cotações", ordens: "Ordens de Compra",
  financeiro: "Financeiro / Fluxo", obras: "Obras", fornecedores: "Fornecedores", insumos: "Insumos",
  usuarios: "Usuários", relatorios: "Relatórios",
};

export default function Usuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selMods, setSelMods] = useState<Modulo[]>([]);
  const [role, setRole] = useState<"admin" | "usuario">("usuario");
  const { refresh } = usePermissions();

  const load = async () => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list" } });
    if (error) { toast.error(error.message); return; }
    const map = new Map<string, any>();
    (data.profiles || []).forEach((p: any) => map.set(p.user_id, { ...p, role: "usuario", modulos: [] }));
    (data.roles || []).forEach((r: any) => { const u = map.get(r.user_id); if (u && r.role === "admin") u.role = "admin"; });
    (data.modulos || []).forEach((m: any) => { const u = map.get(m.user_id); if (u) u.modulos.push(m.modulo); });
    setUsers(Array.from(map.values()));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setSelMods([]); setRole("usuario"); setOpen(true); };
  const openEdit = (u: any) => { setEditing(u); setSelMods(u.modulos); setRole(u.role); setOpen(true); };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      action: editing ? "update" : "create",
      nome: String(fd.get("nome")),
      role,
      modulos: role === "admin" ? ALL_MODULOS : selMods,
    };
    if (editing) {
      payload.user_id = editing.user_id;
      payload.ativo = editing.ativo;
      const pwd = String(fd.get("password") || "");
      if (pwd) payload.password = pwd;
    } else {
      payload.email = String(fd.get("email"));
      payload.password = String(fd.get("password"));
    }
    const { data, error } = await supabase.functions.invoke("admin-users", { body: payload });
    if (error || data?.error) { toast.error(error?.message || data?.error); return; }
    toast.success("Salvo"); setOpen(false); refresh(); load();
  };

  const toggleAtivo = async (u: any) => {
    const { error } = await supabase.functions.invoke("admin-users", { body: { action: "deactivate", user_id: u.user_id, ativo: !u.ativo } });
    if (error) toast.error(error.message); else { toast.success("Atualizado"); load(); }
  };

  return (
    <div>
      <PageHeader title="Usuários" description="Gestão de acessos e permissões" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo usuário</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} usuário</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div><Label>Nome *</Label><Input name="nome" required defaultValue={editing?.nome || ""} /></div>
              {!editing && <div><Label>E-mail *</Label><Input name="email" type="email" required /></div>}
              <div>
                <Label>{editing ? "Nova senha (deixe vazio para manter)" : "Senha *"}</Label>
                <Input name="password" type="password" minLength={6} required={!editing} />
              </div>
              <div>
                <Label>Perfil</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="usuario">Usuário comum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === "usuario" && (
                <div>
                  <Label className="mb-2 block">Módulos liberados</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                    {ALL_MODULOS.map(m => (
                      <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selMods.includes(m)} onCheckedChange={(v) => {
                          setSelMods(v ? [...selMods, m] : selMods.filter(x => x !== m));
                        }} />
                        {MOD_LABEL[m]}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Perfil</TableHead><TableHead>Módulos</TableHead><TableHead>Status</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>
            {users.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum usuário</TableCell></TableRow>}
            {users.map(u => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                <TableCell>{u.email || "—"}</TableCell>
                <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                <TableCell className="text-xs">{u.role === "admin" ? "Todos" : (u.modulos.length ? u.modulos.map((m: Modulo) => MOD_LABEL[m]).join(", ") : "—")}</TableCell>
                <TableCell>{u.ativo ? <Badge variant="outline">Ativo</Badge> : <Badge variant="destructive">Inativo</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => toggleAtivo(u)}><Power className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
