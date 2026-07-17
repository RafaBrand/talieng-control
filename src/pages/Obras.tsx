import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Pencil, Trash2, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { brl, fmtDate } from "@/lib/format";

const STATUS = ["planejada", "em andamento", "pausada", "concluida"];

export default function Obras() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");

  const load = async () => { const { data } = await supabase.from("obras").select("*").order("created_at", { ascending: false }); setItems(data || []); };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      nome: String(fd.get("nome")),
      endereco: String(fd.get("endereco") || "") || null,
      cliente: String(fd.get("cliente") || "") || null,
      status: String(fd.get("status") || "planejada"),
      data_inicio: String(fd.get("data_inicio") || "") || null,
      data_fim: String(fd.get("data_fim") || "") || null,
    };
    const { error, data } = editing
      ? await supabase.from("obras").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("obras").insert(payload).select().single();
    if (error) toast.error(error.message); else { toast.success("Salvo"); if (!editing && data) setEditing(data); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir obra?")) return;
    const { error } = await supabase.from("obras").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter(o => {
      if (fStatus !== "all" && o.status !== fStatus) return false;
      if (!term) return true;
      return [o.nome, o.cliente, o.endereco].some(x => (x || "").toLowerCase().includes(term));
    });
  }, [items, q, fStatus]);

  return (
    <div>
      <PageHeader title="Obras" description="Cadastro e controle de obras" action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Nova</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} obra</DialogTitle></DialogHeader>
            <Tabs defaultValue="dados">
              <TabsList>
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="orcamento" disabled={!editing}><Wallet className="h-3 w-3 mr-1" />Orçamento e Custos</TabsTrigger>
              </TabsList>
              <TabsContent value="dados">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div><Label>Nome *</Label><Input name="nome" required defaultValue={editing?.nome} /></div>
                  <div><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco || ""} /></div>
                  <div><Label>Cliente</Label><Input name="cliente" defaultValue={editing?.cliente || ""} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select name="status" defaultValue={editing?.status || "planejada"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Início</Label><Input name="data_inicio" type="date" defaultValue={editing?.data_inicio || ""} /></div>
                    <div><Label>Fim previsto</Label><Input name="data_fim" type="date" defaultValue={editing?.data_fim || ""} /></div>
                  </div>
                  <Button type="submit" className="w-full">Salvar</Button>
                </form>
              </TabsContent>
              <TabsContent value="orcamento">
                {editing && <OrcamentoObra obraId={editing.id} />}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      } />

      <Card className="p-3 mb-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
            <Input placeholder="Buscar por nome, cliente, endereço..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos status</SelectItem>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cliente</TableHead><TableHead>Endereço</TableHead><TableHead>Status</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma obra</TableCell></TableRow>}
            {filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.nome}</TableCell>
                <TableCell>{o.cliente || "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{o.endereco || "—"}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell>{fmtDate(o.data_inicio)}</TableCell>
                <TableCell>{fmtDate(o.data_fim)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(o.id)}><Trash2 className="h-4 w-4" /></Button>
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

function OrcamentoObra({ obraId }: { obraId: string }) {
  const [cats, setCats] = useState<any[]>([]);
  const [orc, setOrc] = useState<Record<string, number>>({});
  const [realizado, setRealizado] = useState<Record<string, number>>({});

  const load = async () => {
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from("categorias").select("*").order("nome"),
      supabase.from("obra_orcamento").select("*").eq("obra_id", obraId),
    ]);
    setCats(c || []);
    const om: Record<string, number> = {};
    (o || []).forEach((r: any) => { om[r.categoria_id] = Number(r.custo_previsto); });
    setOrc(om);
    // realizado: para cada OC dessa obra com categoria, somar se conta_pagar relacionada estiver paga
    const { data: ocsObra } = await supabase.from("ordens_compra").select("id, categoria_id, total").eq("obra_id", obraId);
    const ocIds = (ocsObra || []).map((x: any) => x.id);
    let pagas: any[] = [];
    if (ocIds.length) {
      const { data } = await supabase.from("contas_pagar").select("ordem_compra_id, valor, status").in("ordem_compra_id", ocIds).eq("status", "pago");
      pagas = data || [];
    }
    const rm: Record<string, number> = {};
    pagas.forEach(p => {
      const oc = (ocsObra || []).find((x: any) => x.id === p.ordem_compra_id);
      if (!oc?.categoria_id) return;
      rm[oc.categoria_id] = (rm[oc.categoria_id] || 0) + Number(p.valor);
    });
    setRealizado(rm);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [obraId]);

  const salvar = async () => {
    const rows = cats.map(c => ({ obra_id: obraId, categoria_id: c.id, custo_previsto: Number(orc[c.id] || 0) }));
    const { error } = await supabase.from("obra_orcamento").upsert(rows, { onConflict: "obra_id,categoria_id" });
    if (error) toast.error(error.message); else toast.success("Orçamento salvo");
  };

  const totalPrev = cats.reduce((s, c) => s + Number(orc[c.id] || 0), 0);
  const totalReal = cats.reduce((s, c) => s + Number(realizado[c.id] || 0), 0);
  const pctGeral = totalPrev > 0 ? (totalReal / totalPrev) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Previsto</p><p className="text-lg font-bold">{brl(totalPrev)}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Realizado</p><p className="text-lg font-bold">{brl(totalReal)}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Saldo</p><p className={`text-lg font-bold ${totalPrev - totalReal < 0 ? "text-destructive" : ""}`}>{brl(totalPrev - totalReal)}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">% Geral</p><p className="text-lg font-bold">{pctGeral.toFixed(1)}%</p></Card>
      </div>

      <div className="border rounded-md max-h-96 overflow-y-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Categoria</TableHead><TableHead>Previsto</TableHead><TableHead>Realizado</TableHead><TableHead>Saldo</TableHead><TableHead>% Consumido</TableHead></TableRow></TableHeader>
          <TableBody>
            {cats.map(c => {
              const p = Number(orc[c.id] || 0);
              const r = Number(realizado[c.id] || 0);
              const pct = p > 0 ? (r / p) * 100 : 0;
              const danger = pct >= 90;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" className="h-8 w-32" value={orc[c.id] || ""} onChange={e => setOrc({ ...orc, [c.id]: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell>{brl(r)}</TableCell>
                  <TableCell className={p - r < 0 ? "text-destructive" : ""}>{brl(p - r)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(pct, 100)} className={`h-2 ${danger ? "[&>div]:bg-destructive" : ""}`} />
                      <span className="text-xs w-12 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button onClick={salvar}>Salvar orçamento</Button>
    </div>
  );
}
