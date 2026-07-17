import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Pencil, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { reloadCentrosCusto } from "@/components/CentroCustoSelect";

const TIPOS = [
  { v: "obra", label: "Obra" },
  { v: "administrativo", label: "Administrativo" },
  { v: "personalizado", label: "Personalizado" },
];

export default function CentrosCusto() {
  const [items, setItems] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [q, setQ] = useState("");
  const [fTipo, setFTipo] = useState("all");
  const [fAtivo, setFAtivo] = useState("ativos");

  const load = async () => {
    const [{ data }, { data: o }] = await Promise.all([
      supabase.from("centros_custo").select("*, obras(nome)").order("codigo"),
      supabase.from("obras").select("id,nome").order("nome"),
    ]);
    setItems(data || []); setObras(o || []);
    reloadCentrosCusto();
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      codigo: String(fd.get("codigo")).trim(),
      nome: String(fd.get("nome")).trim(),
      tipo: String(fd.get("tipo") || "personalizado"),
      obra_id: String(fd.get("obra_id") || "") || null,
      descricao: String(fd.get("descricao") || "") || null,
    };
    const { error } = editing
      ? await supabase.from("centros_custo").update(payload).eq("id", editing.id)
      : await supabase.from("centros_custo").insert({ ...payload, ativo: true });
    if (error) toast.error(error.message); else { toast.success("Salvo"); setOpen(false); setEditing(null); load(); }
  };

  const toggle = async (cc: any) => {
    const { error } = await supabase.from("centros_custo").update({ ativo: !cc.ativo }).eq("id", cc.id);
    if (error) toast.error(error.message); else { toast.success(cc.ativo ? "Desativado" : "Reativado"); load(); }
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter(c => {
      if (fTipo !== "all" && c.tipo !== fTipo) return false;
      if (fAtivo === "ativos" && !c.ativo) return false;
      if (fAtivo === "inativos" && c.ativo) return false;
      if (!term) return true;
      return [c.codigo, c.nome, c.obras?.nome].some(x => (x || "").toLowerCase().includes(term));
    });
  }, [items, q, fTipo, fAtivo]);

  return (
    <div>
      <PageHeader title="Centros de Custo" description="Estrutura para classificar OCs, solicitações e lançamentos financeiros" action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} centro de custo</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Código *</Label><Input name="codigo" required defaultValue={editing?.codigo} placeholder="Ex: CC-ADM-01" /></div>
                <div>
                  <Label>Tipo *</Label>
                  <Select name="tipo" defaultValue={editing?.tipo || "personalizado"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Nome *</Label><Input name="nome" required defaultValue={editing?.nome} /></div>
              <div>
                <Label>Obra vinculada (opcional)</Label>
                <Select name="obra_id" defaultValue={editing?.obra_id || ""}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Nenhuma —</SelectItem>
                    {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Textarea name="descricao" rows={2} defaultValue={editing?.descricao || ""} /></div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <Card className="p-3 mb-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
            <Input placeholder="Buscar por código, nome, obra..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fTipo} onValueChange={setFTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fAtivo} onValueChange={setFAtivo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Apenas ativos</SelectItem>
              <SelectItem value="inativos">Apenas inativos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Obra</TableHead><TableHead>Status</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum centro de custo</TableCell></TableRow>}
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm font-semibold">{c.codigo}</TableCell>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="capitalize">{c.tipo}</TableCell>
                <TableCell>{c.obras?.nome || "—"}</TableCell>
                <TableCell>{c.ativo ? <Badge className="bg-success/15 text-success border-0">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => toggle(c)} title={c.ativo ? "Desativar" : "Reativar"}>
                      <Power className={`h-4 w-4 ${c.ativo ? "text-destructive" : "text-success"}`} />
                    </Button>
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
