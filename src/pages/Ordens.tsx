import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Trash2, FileDown, Search, Pencil, Plus, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { brl, fmtDate } from "@/lib/format";
import { gerarPdfOrdem } from "@/lib/pdf";
import { gerarExcelOrdem } from "@/lib/excel";

const STATUS = ["ag_talieng", "ag_cliente", "aprovada", "comprada", "concluida"];
const STATUS_LABEL: Record<string, string> = {
  ag_talieng: "Ag. Talieng", ag_cliente: "Ag. Cliente", aprovada: "Aprovada",
  comprada: "Comprada", concluida: "Concluída",
};

export default function Ordens() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fForn, setFForn] = useState("all");

  // wizard "Nova OC"
  const [novaOpen, setNovaOpen] = useState(false);
  const [cotsAprov, setCotsAprov] = useState<any[]>([]);
  const [selCot, setSelCot] = useState<any>(null);
  const [selForn, setSelForn] = useState<string>("");

  const load = async () => {
    const [{ data, error }, { data: f }] = await Promise.all([
      supabase.from("ordens_compra").select("*, fornecedores(nome), obras(nome), ordem_itens(descricao)").order("numero", { ascending: false }),
      supabase.from("fornecedores").select("id,nome").order("nome"),
    ]);
    if (error) console.error("load ordens:", error);
    setItems(data || []); setFornecedores(f || []);
  };
  useEffect(() => { load(); }, []);

  const getFornecedorInicial = (cot: any) => {
    const decisao = (cot.cotacao_decisao || []).find((d: any) => {
      const fornecedor = (cot.cotacao_fornecedores || []).find((f: any) => f.id === d.cotacao_fornecedor_id);
      return Boolean(fornecedor?.fornecedor_id);
    });
    if (decisao?.cotacao_fornecedor_id) return decisao.cotacao_fornecedor_id;
    return (cot.cotacao_fornecedores || []).find((f: any) => f.fornecedor_id)?.id || "";
  };

  const abrirNova = async () => {
    const { data: cotacoes, error } = await supabase.from("cotacoes")
      .select("*, obras(nome)")
      .eq("status", "aprovada").order("numero", { ascending: false });
    if (error) { toast.error(error.message); return; }

    const cotIds = (cotacoes || []).map((c: any) => c.id);
    const [fornsRes, itensRes, solsRes, scRes] = await Promise.all([
      cotIds.length ? supabase.from("cotacao_fornecedores").select("*, fornecedores(*)").in("cotacao_id", cotIds).order("ordem") : Promise.resolve({ data: [], error: null } as any),
      cotIds.length ? supabase.from("cotacao_itens").select("*").in("cotacao_id", cotIds).order("ordem") : Promise.resolve({ data: [], error: null } as any),
      cotIds.length ? supabase.from("cotacao_solicitacoes").select("*").in("cotacao_id", cotIds) : Promise.resolve({ data: [], error: null } as any),
      supabase.from("solicitacoes_compra").select("id,numero"),
    ]);
    if (fornsRes.error || itensRes.error || solsRes.error || scRes.error) {
      toast.error(fornsRes.error?.message || itensRes.error?.message || solsRes.error?.message || scRes.error?.message || "Erro ao carregar dados da cotação");
      return;
    }

    const fornIds = (fornsRes.data || []).map((f: any) => f.id);
    const itemIds = (itensRes.data || []).map((i: any) => i.id);
    const [precosRes, decisoesRes] = await Promise.all([
      fornIds.length ? supabase.from("cotacao_precos").select("*").in("cotacao_fornecedor_id", fornIds) : Promise.resolve({ data: [], error: null } as any),
      itemIds.length ? supabase.from("cotacao_decisao").select("*").in("cotacao_item_id", itemIds) : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (precosRes.error || decisoesRes.error) { toast.error(precosRes.error?.message || decisoesRes.error?.message || "Erro ao carregar preços da cotação"); return; }

    const scMap = new Map((scRes.data || []).map((s: any) => [s.id, s]));
    const stitched = (cotacoes || []).map((c: any) => ({
      ...c,
      cotacao_fornecedores: (fornsRes.data || []).filter((f: any) => f.cotacao_id === c.id),
      cotacao_itens: (itensRes.data || []).filter((i: any) => i.cotacao_id === c.id),
      cotacao_precos: (precosRes.data || []).filter((p: any) =>
        (fornsRes.data || []).some((f: any) => f.id === p.cotacao_fornecedor_id && f.cotacao_id === c.id)
      ),
      cotacao_decisao: (decisoesRes.data || []).filter((d: any) =>
        (itensRes.data || []).some((i: any) => i.id === d.cotacao_item_id && i.cotacao_id === c.id)
      ),
      cotacao_solicitacoes: (solsRes.data || []).filter((s: any) => s.cotacao_id === c.id).map((s: any) => ({
        ...s,
        solicitacoes_compra: scMap.get(s.solicitacao_id) || null,
      })),
    }));

    setCotsAprov(stitched); setSelCot(null); setSelForn(""); setNovaOpen(true);
  };

  const irParaNova = () => {
    if (!selCot) { toast.error("Selecione uma cotação"); return; }
    if (!selForn) { toast.error("Selecione o fornecedor"); return; }
    navigate(`/ordens/nova?cotacao=${selCot.id}&fornecedor=${selForn}`);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("ordens_compra").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from("ordens_compra").delete().eq("id", id); load();
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter(o => {
      if (fStatus !== "all" && o.status !== fStatus) return false;
      if (fForn !== "all" && o.fornecedor_id !== fForn) return false;
      if (!term) return true;
      const itensDesc = (o.ordem_itens || []).map((i: any) => i.descricao).join(" ");
      return [itensDesc, o.fornecedores?.nome, o.obras?.nome, String(o.numero)].some(x => (x || "").toString().toLowerCase().includes(term));
    });
  }, [items, q, fStatus, fForn]);

  const totalCot = (c: any) => (c.cotacao_itens || []).reduce((s: number, it: any) => {
    const ps = (c.cotacao_precos || []).filter((p: any) => p.cotacao_item_id === it.id && p.preco_unitario > 0);
    const min = ps.length ? Math.min(...ps.map((p: any) => Number(p.preco_unitario))) : 0;
    return s + min * Number(it.quantidade || 0);
  }, 0);

  return (
    <div>
      <PageHeader title="Ordens de Compra" description="Geradas a partir de cotações aprovadas" action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/ordens/nova")}><Plus className="h-4 w-4 mr-2" />OC sem cotação</Button>
          <Button onClick={abrirNova}><Plus className="h-4 w-4 mr-2" />Gerar OC a partir de Cotação</Button>
        </div>
      } />

      <Card className="p-3 mb-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
            <Input placeholder="Buscar por nº, item, fornecedor, obra..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos status</SelectItem>{STATUS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fForn} onValueChange={setFForn}>
            <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos fornecedores</SelectItem>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Fornecedor</TableHead><TableHead>Obra</TableHead><TableHead>Tipo</TableHead><TableHead>Fat. Direto</TableHead><TableHead>Total</TableHead><TableHead>Criada em</TableHead><TableHead>Entrega</TableHead><TableHead>Status</TableHead><TableHead className="w-44"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhuma ordem. Crie uma cotação aprovada e gere a OC a partir dela.</TableCell></TableRow>}
            {filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-sm font-bold text-primary">OC {String(o.numero).padStart(2, "0")}</TableCell>
                <TableCell>{o.fornecedores?.nome || "—"}</TableCell>
                <TableCell>{o.obras?.nome || "—"}</TableCell>
                <TableCell className="text-xs">{o.tipo_compra === "mao_de_obra" ? "Mão de Obra" : "Material"}</TableCell>
                <TableCell className="text-xs">{o.faturamento_direto ? "Sim" : "Não"}</TableCell>
                <TableCell className="font-semibold">{brl(o.total)}</TableCell>
                <TableCell>{fmtDate(o.created_at?.slice(0, 10))}</TableCell>
                <TableCell>{fmtDate(o.prazo_entrega)}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/ordens/${o.id}/editar`)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Baixar PDF" onClick={() => gerarPdfOrdem(o.id)}><FileDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Baixar Excel (modelo Talieng)" onClick={() => gerarExcelOrdem(o.id)}><FileSpreadsheet className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(o.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Ordem de Compra</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">1. Selecione a cotação aprovada</Label>
              {cotsAprov.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 border rounded-md">Nenhuma cotação aprovada disponível. Aprove a cotação na aba de Cotações antes de gerar a OC.</p>
              ) : (
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  {cotsAprov.map(c => (
                    <div key={c.id} onClick={() => { setSelCot(c); setSelForn(getFornecedorInicial(c)); }}
                      className={`p-3 border-b cursor-pointer hover:bg-muted ${selCot?.id === c.id ? "bg-primary/10" : ""}`}>
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-primary">COT {String(c.numero).padStart(2, "0")}</span>
                        <span className="font-semibold">{brl(totalCot(c))}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(c.cotacao_solicitacoes || []).map((x: any) => `SC ${String(x.solicitacoes_compra?.numero || 0).padStart(2, "0")}`).join(", ") || "—"}
                        {" · "}{c.obras?.nome || "—"}
                        {" · "}{(c.cotacao_fornecedores || []).map((f: any) => f.fornecedores?.nome || f.nome_avulso).filter(Boolean).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selCot && (
              <div>
                <Label className="mb-2 block">2. Selecione o fornecedor</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(selCot.cotacao_fornecedores || []).filter((f: any) => f.fornecedor_id).map((f: any) => (
                    <div key={f.id} onClick={() => setSelForn(f.id)}
                      className={`p-3 border rounded-md cursor-pointer hover:bg-muted ${selForn === f.id ? "bg-primary/10 border-primary" : ""}`}>
                      <div className="font-medium text-sm">{f.fornecedores?.nome}</div>
                      <div className="text-xs text-muted-foreground">{f.fornecedores?.cnpj || "—"}</div>
                      {f.condicao_pagamento && <div className="text-xs">Pagto: {f.condicao_pagamento}</div>}
                    </div>
                  ))}
                </div>
                {(selCot.cotacao_fornecedores || []).filter((f: any) => f.fornecedor_id).length === 0 &&
                  <p className="text-xs text-muted-foreground">Nenhum fornecedor cadastrado nesta cotação. Cadastre os fornecedores no módulo Fornecedores para poder gerar OC.</p>}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setNovaOpen(false)}>Cancelar</Button>
              <Button onClick={irParaNova} disabled={!selCot || !selForn}>Continuar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
