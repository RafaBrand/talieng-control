import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CentroCustoSelect } from "@/components/CentroCustoSelect";
import { Plus, Trash2, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { brl, fmtDate } from "@/lib/format";

type Props = { tipo: "pagar" | "receber" };
export default function Contas({ tipo }: Props) {
  const tabela = tipo === "pagar" ? "contas_pagar" : "contas_receber";
  const titulo = tipo === "pagar" ? "Contas a Pagar" : "Contas a Receber";
  const statusFinal = tipo === "pagar" ? "pago" : "recebido";
  const dataField = tipo === "pagar" ? "data_pagamento" : "data_recebimento";

  const [items, setItems] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [obraSel, setObraSel] = useState<string>("");
  const [ccId, setCcId] = useState<string>("");

  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fObra, setFObra] = useState("all");

  const load = async () => {
    const select = tipo === "pagar" ? "*, fornecedores(nome), obras(nome)" : "*, obras(nome)";
    const [{ data }, { data: f }, { data: o }] = await Promise.all([
      supabase.from(tabela).select(select).order("vencimento"),
      supabase.from("fornecedores").select("id,nome"),
      supabase.from("obras").select("id,nome"),
    ]);
    setItems(data || []); setFornecedores(f || []); setObras(o || []);
  };
  useEffect(() => { load(); }, [tipo]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!ccId) { toast.error("Selecione o centro de custo"); return; }
    const payload: any = {
      descricao: String(fd.get("descricao")),
      valor: Number(fd.get("valor")),
      vencimento: String(fd.get("vencimento")),
      obra_id: obraSel || null,
      centro_custo_id: ccId,
    };
    if (tipo === "pagar") payload.fornecedor_id = String(fd.get("fornecedor_id") || "") || null;
    else payload.cliente = String(fd.get("cliente") || "") || null;

    const { error } = await supabase.from(tabela).insert(payload);
    if (error) toast.error(error.message); else { toast.success("Salvo"); setOpen(false); setObraSel(""); setCcId(""); load(); }
  };

  const baixar = async (id: string) => {
    const update: any = { status: statusFinal, [dataField]: new Date().toISOString().slice(0,10) };
    const { error } = await (supabase.from(tabela) as any).update(update).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Baixa registrada"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from(tabela).delete().eq("id", id); load();
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter(c => {
      if (fStatus !== "all" && c.status !== fStatus) return false;
      if (fObra !== "all" && c.obra_id !== fObra) return false;
      if (!term) return true;
      const who = tipo === "pagar" ? c.fornecedores?.nome : c.cliente;
      return [c.descricao, who, c.obras?.nome].some(x => (x || "").toLowerCase().includes(term));
    });
  }, [items, q, fStatus, fObra, tipo]);

  return (
    <div>
      <PageHeader title={titulo} action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div><Label>Descrição *</Label><Input name="descricao" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor *</Label><Input name="valor" type="number" step="0.01" required /></div>
                <div><Label>Vencimento *</Label><Input name="vencimento" type="date" required /></div>
              </div>
              {tipo === "pagar" ? (
                <div>
                  <Label>Fornecedor</Label>
                  <Select name="fornecedor_id">
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div><Label>Cliente</Label><Input name="cliente" /></div>
              )}
              <div>
                <Label>Obra</Label>
                <Select value={obraSel} onValueChange={(v) => { setObraSel(v); setCcId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Centro de Custo *</Label>
                <CentroCustoSelect value={ccId} onValueChange={setCcId} obraId={obraSel || null} required />
              </div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <Card className="p-3 mb-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
            <Input placeholder="Buscar por descrição, fornecedor/cliente, obra..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pendente">pendente</SelectItem>
              <SelectItem value={statusFinal}>{statusFinal}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fObra} onValueChange={setFObra}>
            <SelectTrigger><SelectValue placeholder="Obra" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas obras</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>{tipo === "pagar" ? "Fornecedor" : "Cliente"}</TableHead><TableHead>Obra</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma conta</TableCell></TableRow>}
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.descricao}</TableCell>
                <TableCell>{tipo === "pagar" ? (c.fornecedores?.nome || "—") : (c.cliente || "—")}</TableCell>
                <TableCell>{c.obras?.nome || "—"}</TableCell>
                <TableCell className={`font-semibold ${tipo === "pagar" ? "text-destructive" : "text-success"}`}>{brl(c.valor)}</TableCell>
                <TableCell>{fmtDate(c.vencimento)}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {c.status === "pendente" && <Button size="icon" variant="ghost" onClick={() => baixar(c.id)} title="Dar baixa"><Check className="h-4 w-4 text-success" /></Button>}
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
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
