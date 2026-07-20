import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Trash2, FileDown, Eye, Search, Trophy, Pencil, Send, MessageCircle, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

const STATUS = ["aberta", "em_analise", "aprovada", "convertida"];

export default function Cotacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<any>(null);
  const [sendTo, setSendTo] = useState<any>(null);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  // wizard state
  const [selSols, setSelSols] = useState<string[]>([]);
  const [nForn, setNForn] = useState(2);
  const [forns, setForns] = useState<any[]>([{}, {}]);
  const [precos, setPrecos] = useState<Record<string, Record<number, string>>>({}); // {itemId: {fornIdx: preco}}
  const [consolidatedItems, setConsolidatedItems] = useState<any[]>([]);
  const [usaEndObra, setUsaEndObra] = useState(true);
  const [endEntrega, setEndEntrega] = useState("");
  const [paraContratacao, setParaContratacao] = useState(false);
  const [tipoCompra, setTipoCompra] = useState<"material" | "mao_de_obra">("material");

  const load = async () => {
    setLoading(true);
    const [cotRes, csRes, ciRes, cfRes, cpRes, cdRes, obrasRes, scRes, solRes, fornRes] = await Promise.all([
      supabase.from("cotacoes").select("*").order("created_at", { ascending: false }),
      supabase.from("cotacao_solicitacoes").select("*"),
      supabase.from("cotacao_itens").select("*"),
      supabase.from("cotacao_fornecedores").select("*"),
      supabase.from("cotacao_precos").select("*"),
      supabase.from("cotacao_decisao").select("*"),
      supabase.from("obras").select("id,nome,endereco"),
      supabase.from("solicitacoes_compra").select("id,numero"),
      supabase.from("solicitacoes_compra").select("*, obras(nome,endereco), solicitacao_itens(*)").in("status", ["aberta", "em_cotacao"]).order("numero", { ascending: false }),
      supabase.from("fornecedores").select("id,nome").order("nome"),
    ]);

    console.log("[Cotações] load", { cotacoes: cotRes.data?.length, erro: cotRes.error });

    if (cotRes.error) toast.error(`Erro ao buscar cotações: ${cotRes.error.message}`);

    const obrasMap = new Map((obrasRes.data || []).map((o: any) => [o.id, o]));
    const scMap = new Map((scRes.data || []).map((s: any) => [s.id, s]));
    const fornMap = new Map((fornRes.data || []).map((f: any) => [f.id, f]));

    const stitched = (cotRes.data || []).map((c: any) => ({
      ...c,
      obras: obrasMap.get(c.obra_id) || null,
      cotacao_solicitacoes: (csRes.data || []).filter((x: any) => x.cotacao_id === c.id).map((x: any) => ({
        ...x, solicitacoes_compra: scMap.get(x.solicitacao_id) || null,
      })),
      cotacao_itens: (ciRes.data || []).filter((x: any) => x.cotacao_id === c.id),
      cotacao_fornecedores: (cfRes.data || []).filter((x: any) => x.cotacao_id === c.id).map((x: any) => ({
        ...x, fornecedores: x.fornecedor_id ? fornMap.get(x.fornecedor_id) || null : null,
      })),
      cotacao_precos: (cpRes.data || []).filter((p: any) =>
        (cfRes.data || []).some((f: any) => f.id === p.cotacao_fornecedor_id && f.cotacao_id === c.id)
      ),
      cotacao_decisao: (cdRes.data || []).filter((d: any) =>
        (ciRes.data || []).some((it: any) => it.id === d.cotacao_item_id && it.cotacao_id === c.id)
      ),
    }));

    setItems(stitched);
    setSolicitacoes(solRes.data || []);
    setFornecedores(fornRes.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // when sols selected, build consolidated list + inherit tipo_compra
  useEffect(() => {
    const list: any[] = [];
    selSols.forEach(sid => {
      const sol = solicitacoes.find(x => x.id === sid);
      (sol?.solicitacao_itens || []).forEach((it: any) => list.push({ ...it, _solicitacao_id: sid, _obra_id: sol.obra_id }));
    });
    setConsolidatedItems(list);
    if (selSols.length && !editingId) {
      const primeiro = solicitacoes.find(x => x.id === selSols[0]);
      if (primeiro?.tipo_compra) setTipoCompra(primeiro.tipo_compra);
    }
  }, [selSols, solicitacoes, editingId]);

  useEffect(() => {
    setForns(prev => Array.from({ length: nForn }).map((_, i) => prev[i] || {}));
  }, [nForn]);

  // Se marcar "para contratação", força apenas 1 fornecedor
  useEffect(() => {
    if (paraContratacao) setNForn(1);
    else if (nForn < 2) setNForn(2);
    // eslint-disable-next-line
  }, [paraContratacao]);

  const reset = () => {
    setSelSols([]); setNForn(2); setForns([{}, {}]); setPrecos({}); setConsolidatedItems([]);
    setEditingId(null);
    setUsaEndObra(true); setEndEntrega("");
    setParaContratacao(false); setTipoCompra("material");
  };

  const openEdit = (cot: any) => {
    const sols = (cot.cotacao_solicitacoes || []).map((x: any) => x.solicitacao_id);
    const fornsState = (cot.cotacao_fornecedores || []).slice().sort((a: any, b: any) => a.ordem - b.ordem).map((f: any) => ({
      fornecedor_id: f.fornecedor_id || "", nome_avulso: f.nome_avulso || "",
      prazo_entrega: f.prazo_entrega || "", condicao_pagamento: f.condicao_pagamento || "",
    }));
    // map prices: keyed by solicitacao_item_id (since wizard reuses original item ids)
    const precosMap: Record<string, Record<number, string>> = {};
    (cot.cotacao_itens || []).forEach((ci: any) => {
      const origId = ci.solicitacao_item_id;
      if (!origId) return;
      precosMap[origId] = {};
      fornsState.forEach((_: any, fIdx: number) => {
        const cf = (cot.cotacao_fornecedores || []).find((cf: any) => cf.ordem === fIdx);
        const p = (cot.cotacao_precos || []).find((p: any) => p.cotacao_item_id === ci.id && p.cotacao_fornecedor_id === cf?.id);
        precosMap[origId][fIdx] = p?.preco_unitario ? String(p.preco_unitario) : "";
      });
    });
    setEditingId(cot.id);
    setSelSols(sols);
    setParaContratacao(!!cot.para_contratacao);
    setTipoCompra(cot.tipo_compra || "material");
    setNForn(cot.para_contratacao ? 1 : Math.max(2, fornsState.length));
    setForns(fornsState.length ? fornsState : [{}, {}]);
    setPrecos(precosMap);
    setUsaEndObra(cot.usa_endereco_obra ?? true);
    setEndEntrega(cot.endereco_entrega || "");
    setOpen(true);
  };

  const onCreate = async () => {
    if (selSols.length === 0) { toast.error("Selecione ao menos 1 solicitação"); return; }
    if (consolidatedItems.length === 0) { toast.error("Sem itens"); return; }
    if (paraContratacao && forns.length !== 1) { toast.error("Cotação para contratação exige exatamente 1 fornecedor"); return; }
    if (!paraContratacao && (forns.length < 2 || forns.length > 8)) { toast.error("Informe de 2 a 8 fornecedores"); return; }
    if (forns.some(f => !f.fornecedor_id && !f.nome_avulso)) { toast.error("Preencha todos os fornecedores"); return; }

    const obraId = solicitacoes.find(x => x.id === selSols[0])?.obra_id;
    let cotId = editingId;

    if (editingId) {
      // limpar filhos antes de reinserir
      await supabase.from("cotacao_decisao").delete().in("cotacao_item_id",
        (await supabase.from("cotacao_itens").select("id").eq("cotacao_id", editingId)).data?.map((x: any) => x.id) || ["00000000-0000-0000-0000-000000000000"]);
      await supabase.from("cotacao_precos").delete().in("cotacao_fornecedor_id",
        (await supabase.from("cotacao_fornecedores").select("id").eq("cotacao_id", editingId)).data?.map((x: any) => x.id) || ["00000000-0000-0000-0000-000000000000"]);
      await supabase.from("cotacao_itens").delete().eq("cotacao_id", editingId);
      await supabase.from("cotacao_fornecedores").delete().eq("cotacao_id", editingId);
      await supabase.from("cotacao_solicitacoes").delete().eq("cotacao_id", editingId);
      await supabase.from("cotacoes").update({
        obra_id: obraId,
        usa_endereco_obra: usaEndObra,
        endereco_entrega: usaEndObra ? null : (endEntrega || null),
        para_contratacao: paraContratacao,
        tipo_compra: tipoCompra,
        updated_at: new Date().toISOString(),
      } as any).eq("id", editingId);
    } else {
      const { data: cot, error } = await supabase.from("cotacoes").insert({
        obra_id: obraId, status: "aberta", criado_por: user?.id,
        usa_endereco_obra: usaEndObra,
        endereco_entrega: usaEndObra ? null : (endEntrega || null),
        para_contratacao: paraContratacao,
        tipo_compra: tipoCompra,
      } as any).select("id").single();
      if (error || !cot) { toast.error(error?.message || "Erro"); return; }
      cotId = cot.id;
    }

    await supabase.from("cotacao_solicitacoes").insert(selSols.map(sid => ({ cotacao_id: cotId!, solicitacao_id: sid })));

    const itensIns = consolidatedItems.map((it, idx) => ({
      cotacao_id: cotId!, solicitacao_item_id: it.id, item: it.item,
      quantidade: it.quantidade, unidade: it.unidade, ordem: idx,
    }));
    const { data: insertedItens } = await supabase.from("cotacao_itens").insert(itensIns).select("*");

    const fornsIns = forns.map((f, idx) => ({
      cotacao_id: cotId!, fornecedor_id: f.fornecedor_id || null, nome_avulso: f.nome_avulso || null,
      prazo_entrega: f.prazo_entrega || null, condicao_pagamento: f.condicao_pagamento || null, ordem: idx,
    }));
    const { data: insertedForns } = await supabase.from("cotacao_fornecedores").insert(fornsIns).select("*");

    const precoRows: any[] = [];
    (insertedItens || []).forEach((it, iIdx) => {
      (insertedForns || []).forEach((fr, fIdx) => {
        const origItem = consolidatedItems[iIdx];
        const v = Number(precos[origItem.id]?.[fIdx] || 0);
        precoRows.push({ cotacao_fornecedor_id: fr.id, cotacao_item_id: it.id, preco_unitario: v });
      });
    });
    if (precoRows.length) await supabase.from("cotacao_precos").insert(precoRows);

    // SC status agora é atualizado por trigger no banco
    toast.success(editingId ? "Cotação atualizada" : "Cotação criada"); setOpen(false); reset(); await load();
  };

  const setDecisao = async (cotacaoItemId: string, cotacaoFornecedorId: string) => {
    await supabase.from("cotacao_decisao").upsert({ cotacao_item_id: cotacaoItemId, cotacao_fornecedor_id: cotacaoFornecedorId });
    await load();
  };

  // mantém o dialog de equalização em sincronia com os itens recarregados
  useEffect(() => {
    if (!view) return;
    const fresh = items.find(c => c.id === view.id);
    if (fresh) setView(fresh);
  }, [items]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("cotacoes").update({ status }).eq("id", id);
    if (view?.id === id) setView({ ...view, status });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir cotação?")) return;
    await supabase.from("cotacoes").delete().eq("id", id); load();
  };

  // Redireciona para o formulário de OC já pré-preenchido com itens da cotação
  const gerarOC = async (cot: any) => {
    // Garante decisões: se não há, calcula vencedores por menor preço
    let decisoes: any[] = cot.cotacao_decisao || [];
    if (decisoes.length === 0) {
      const auto = computeWinners(cot);
      if (auto.length === 0) {
        toast.error("Preencha os preços antes de gerar a OC");
        return;
      }
      await supabase.from("cotacao_decisao").upsert(auto);
      decisoes = auto;
    }
    // Pega o fornecedor (cotacao_fornecedor_id) do primeiro item decidido
    const primeiroFornCot = decisoes[0]?.cotacao_fornecedor_id;
    if (!primeiroFornCot) {
      toast.error("Selecione o fornecedor vencedor de pelo menos um item");
      return;
    }
    const fornCot = (cot.cotacao_fornecedores || []).find((f: any) => f.id === primeiroFornCot);
    if (!fornCot?.fornecedor_id) {
      toast.error("O fornecedor vencedor precisa estar cadastrado em Fornecedores");
      return;
    }
    // Marca cotação como aprovada se ainda não estiver
    if (cot.status === "aberta" || cot.status === "em_analise") {
      await supabase.from("cotacoes").update({ status: "aprovada" }).eq("id", cot.id);
    }
    setView(null);
    navigate(`/ordens/nova?cotacao=${cot.id}&fornecedor=${primeiroFornCot}`);
  };


  const computeWinners = (cot: any) => {
    return (cot.cotacao_itens || []).map((it: any) => {
      const ps = (cot.cotacao_precos || []).filter((p: any) => p.cotacao_item_id === it.id && p.preco_unitario > 0);
      if (!ps.length) return null;
      const min = ps.reduce((a: any, b: any) => a.preco_unitario < b.preco_unitario ? a : b);
      return { cotacao_item_id: it.id, cotacao_fornecedor_id: min.cotacao_fornecedor_id };
    }).filter(Boolean);
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter(c => {
      if (fStatus !== "all" && c.status !== fStatus) return false;
      if (!term) return true;
      return String(c.numero).includes(term) || (c.cotacao_itens || []).some((i: any) => i.item.toLowerCase().includes(term));
    });
  }, [items, q, fStatus]);

  return (
    <div>
      <PageHeader title="Cotações" description="Compare fornecedores e gere ordens de compra" action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova cotação</Button></DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? `Editar cotação COT ${String(items.find(x => x.id === editingId)?.numero || 0).padStart(2, "0")}` : "Nova cotação"}</DialogTitle></DialogHeader>

            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">1. Solicitações aprovadas</Label>
                {solicitacoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma solicitação aprovada disponível.</p> : (
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-1">
                    {solicitacoes.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selSols.includes(s.id)} onCheckedChange={(v) => setSelSols(v ? [...selSols, s.id] : selSols.filter(x => x !== s.id))} />
                        <span className="font-medium">{s.titulo || `#${s.id.slice(0,6)}`}</span>
                        <span className="text-muted-foreground">— {s.obras?.nome} ({s.solicitacao_itens?.length || 0} itens)</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {consolidatedItems.length > 0 && (
                <>
                  <div>
                    <Label className="mb-2 block">2. Quantidade de fornecedores (2 a 5)</Label>
                    <Input type="number" min={2} max={5} value={nForn} onChange={e => setNForn(Math.max(2, Math.min(5, Number(e.target.value) || 2)))} className="w-24" />
                  </div>

                  <div>
                    <Label className="mb-2 block">3. Dados dos fornecedores e preços</Label>
                    <div className="overflow-x-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 sticky left-0 bg-muted">Item</th>
                            <th className="text-left p-2">Qtd</th>
                            {forns.map((_, i) => (
                              <th key={i} className="text-left p-2 min-w-48">
                                <div className="space-y-1">
                                  <Select value={forns[i].fornecedor_id || ""} onValueChange={(v) => { const c = [...forns]; c[i].fornecedor_id = v; c[i].nome_avulso = ""; setForns(c); }}>
                                    <SelectTrigger className="h-8"><SelectValue placeholder="Fornecedor cadastrado" /></SelectTrigger>
                                    <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Input className="h-7" placeholder="ou nome avulso" value={forns[i].nome_avulso || ""} onChange={e => { const c = [...forns]; c[i].nome_avulso = e.target.value; c[i].fornecedor_id = ""; setForns(c); }} />
                                  <Input className="h-7" placeholder="Prazo entrega" value={forns[i].prazo_entrega || ""} onChange={e => { const c = [...forns]; c[i].prazo_entrega = e.target.value; setForns(c); }} />
                                  <Input className="h-7" placeholder="Cond. pagto (ex: 30, 30/60)" value={forns[i].condicao_pagamento || ""} onChange={e => { const c = [...forns]; c[i].condicao_pagamento = e.target.value; setForns(c); }} />
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {consolidatedItems.map(it => (
                            <tr key={it.id} className="border-t">
                              <td className="p-2 sticky left-0 bg-background">{it.item}</td>
                              <td className="p-2">{it.quantidade} {it.unidade}</td>
                              {forns.map((_, i) => (
                                <td key={i} className="p-1">
                                  <Input type="number" step="0.01" placeholder="0.00" className="h-8"
                                    value={precos[it.id]?.[i] || ""}
                                    onChange={e => setPrecos({ ...precos, [it.id]: { ...(precos[it.id] || {}), [i]: e.target.value } })} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">4. Endereço de entrega</Label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                      <Checkbox checked={usaEndObra} onCheckedChange={(v) => setUsaEndObra(!!v)} />
                      <span>Usar o mesmo endereço da obra</span>
                    </label>
                    {usaEndObra ? (
                      <Input
                        disabled
                        value={solicitacoes.find(s => s.id === selSols[0])?.obras?.endereco || "(obra sem endereço cadastrado)"}
                      />
                    ) : (
                      <Input
                        placeholder="Endereço de entrega específico"
                        value={endEntrega}
                        onChange={e => setEndEntrega(e.target.value)}
                      />
                    )}
                  </div>

                  <Button onClick={onCreate} className="w-full">{editingId ? "Salvar alterações" : "Salvar cotação"}</Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      } />

      <Card className="p-3 mb-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
            <Input placeholder="Buscar por nº ou item..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos status</SelectItem>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>SCs origem</TableHead><TableHead>Obra</TableHead><TableHead>Data</TableHead><TableHead>Fornecedores</TableHead><TableHead>Status</TableHead><TableHead className="w-44"></TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando cotações...</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma cotação encontrada</TableCell></TableRow>}
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm font-bold text-primary">COT {String(c.numero).padStart(2, "0")}</TableCell>
                <TableCell className="text-xs">
                  {(c.cotacao_solicitacoes || []).map((x: any) => `SC ${String(x.solicitacoes_compra?.numero || 0).padStart(2, "0")}`).join(", ") || "—"}
                </TableCell>
                <TableCell>{c.obras?.nome || "—"}</TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-xs">
                  {(c.cotacao_fornecedores || []).map((f: any) => f.fornecedores?.nome || f.nome_avulso).filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell>
                  <div className="flex gap-1 items-center">
                    <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Enviar a fornecedores" onClick={() => setSendTo(c)}><Send className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Equalizar" onClick={() => setView(c)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {view && <EqualizacaoDialog cot={view} onClose={() => setView(null)} setDecisao={setDecisao} gerarOC={gerarOC} />}
      {sendTo && <EnviarFornecedoresDialog cot={sendTo} onClose={() => setSendTo(null)} />}
    </div>
  );
}

function EqualizacaoDialog({ cot, onClose, setDecisao, gerarOC }: any) {
  const itens = cot.cotacao_itens || [];
  const forns = cot.cotacao_fornecedores || [];
  const precos = cot.cotacao_precos || [];
  const decisao: any[] = cot.cotacao_decisao || [];

  const getPreco = (itId: string, fId: string) => precos.find((p: any) => p.cotacao_item_id === itId && p.cotacao_fornecedor_id === fId)?.preco_unitario || 0;
  const itMin = (itId: string) => {
    const ps = forns.map((f: any) => getPreco(itId, f.id)).filter((v: number) => v > 0);
    return ps.length ? Math.min(...ps) : 0;
  };
  const totalForn = (fId: string) => itens.reduce((s: number, it: any) => s + Number(getPreco(it.id, fId)) * Number(it.quantidade || 0), 0);
  const totalGlobalForn = (fId: string) => {
    const all = forns.every((f: any) => itens.every((it: any) => getPreco(it.id, f.id) > 0));
    return all ? totalForn(fId) : null;
  };
  const melhorGlobal = forns.reduce((best: any, f: any) => {
    const t = totalGlobalForn(f.id);
    if (t === null) return best;
    if (!best || t < best.t) return { f, t };
    return best;
  }, null);

  const totalFracionado = itens.reduce((s: number, it: any) => {
    const dec = decisao.find(d => d.cotacao_item_id === it.id);
    const f = dec ? getPreco(it.id, dec.cotacao_fornecedor_id) : itMin(it.id);
    return s + Number(f) * Number(it.quantidade || 0);
  }, 0);

  const fNome = (f: any) => f.fornecedores?.nome || f.nome_avulso || "—";

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Equalização — Cotação #{String(cot.numero).padStart(5,"0")}</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">Item</th>
                <th className="text-left p-2">Qtd</th>
                {forns.map((f: any) => (
                  <th key={f.id} className="text-left p-2">
                    {fNome(f)}
                    {melhorGlobal?.f.id === f.id && <Badge className="ml-2 bg-success text-success-foreground"><Trophy className="h-3 w-3 mr-1" />Melhor global</Badge>}
                    <div className="text-xs font-normal text-muted-foreground">Prazo: {f.prazo_entrega || "—"} | {f.condicao_pagamento || "—"}</div>
                  </th>
                ))}
                <th className="text-left p-2">Decisão</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((it: any) => {
                const min = itMin(it.id);
                const dec = decisao.find(d => d.cotacao_item_id === it.id);
                return (
                  <tr key={it.id} className="border-t">
                    <td className="p-2 font-medium">{it.item}</td>
                    <td className="p-2">{it.quantidade} {it.unidade}</td>
                    {forns.map((f: any) => {
                      const p = getPreco(it.id, f.id);
                      const isMin = p > 0 && p === min;
                      return <td key={f.id} className={`p-2 ${isMin ? "bg-green-100 dark:bg-green-950 font-semibold" : ""}`}>{p > 0 ? brl(p) : "—"}</td>;
                    })}
                    <td className="p-2">
                      <Select value={dec?.cotacao_fornecedor_id || ""} onValueChange={(v) => setDecisao(it.id, v)}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Auto (menor)" /></SelectTrigger>
                        <SelectContent>{forns.map((f: any) => <SelectItem key={f.id} value={f.id}>{fNome(f)}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t bg-muted font-semibold">
                <td colSpan={2} className="p-2">TOTAL</td>
                {forns.map((f: any) => {
                  const t = totalGlobalForn(f.id);
                  return <td key={f.id} className={`p-2 ${melhorGlobal?.f.id === f.id ? "text-success" : ""}`}>{t !== null ? brl(t) : "—"}</td>;
                })}
                <td className="p-2 text-primary">Fracionado: {brl(totalFracionado)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          {cot.status !== "convertida" && (
            <Button onClick={() => gerarOC(cot)}>
              <FileDown className="h-4 w-4 mr-2" />Gerar Ordem de Compra
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-right">
          A OC será aberta no formulário já preenchida com os itens vencedores.
        </p>

      </DialogContent>
    </Dialog>
  );
}

function EnviarFornecedoresDialog({ cot, onClose }: { cot: any; onClose: () => void }) {
  const [allFornecedores, setAllFornecedores] = useState<any[]>([]);
  const [envios, setEnvios] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [empresa, setEmpresa] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [waPanel, setWaPanel] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: e }, { data: emp }] = await Promise.all([
        supabase.from("fornecedores").select("id,nome,email,telefone,categoria_id").order("nome"),
        supabase.from("cotacao_envios").select("*").eq("cotacao_id", cot.id).order("created_at", { ascending: false }),
        supabase.from("empresa_config").select("nome").limit(1).maybeSingle(),
      ]);
      setAllFornecedores(f || []);
      setEnvios(e || []);
      setEmpresa(emp);
      // pré-marca fornecedores já vinculados à cotação
      const pre: Record<string, boolean> = {};
      (cot.cotacao_fornecedores || []).forEach((cf: any) => { if (cf.fornecedor_id) pre[cf.fornecedor_id] = true; });
      setSelected(pre);
    })();
  }, [cot.id]);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return allFornecedores;
    return allFornecedores.filter(f => [f.nome, f.email, f.telefone].some(x => (x || "").toLowerCase().includes(t)));
  }, [allFornecedores, q]);

  const selIds = Object.keys(selected).filter(k => selected[k]);
  const lastEnvio = (fid: string, canal: string) => envios.find(e => e.fornecedor_id === fid && e.canal === canal);

  const toggleAll = (checked: boolean, filter?: "email" | "whatsapp") => {
    const next = { ...selected };
    filtered.forEach(f => {
      if (filter === "email" && !f.email) return;
      if (filter === "whatsapp" && !f.telefone) return;
      next[f.id] = checked;
    });
    setSelected(next);
  };

  const buildMessage = () => {
    const itens = (cot.cotacao_itens || []).map((it: any) =>
      `${it.item} - QTDE ${it.quantidade} - UN ${it.unidade || ""}`.trim()
    ).join("\n");
    const numero = `COT ${String(cot.numero).padStart(2, "0")}`;
    const endereco = cot.usa_endereco_obra
      ? (cot.obras?.endereco || "—")
      : (cot.endereco_entrega || "—");
    return `Olá! Tudo bem?\nSegue solicitação de cotação ${numero}:\n\nObra: ${cot.obras?.nome || "—"}\nItens:\n${itens}\nEndereço de Entrega: ${endereco}\n\nPor favor, responda informando preço unitário, prazo de entrega, condição de pagamento e validade da proposta. Obrigado!`;
  };

  const enviarEmail = async () => {
    if (selIds.length === 0) { toast.error("Selecione ao menos 1 fornecedor"); return; }
    const semEmail = selIds.filter(id => !allFornecedores.find(f => f.id === id)?.email);
    if (semEmail.length === selIds.length) { toast.error("Nenhum fornecedor selecionado tem e-mail cadastrado"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-cotacao-fornecedores", {
        body: { cotacao_id: cot.id, fornecedor_ids: selIds },
      });
      if (error) throw error;
      const results = (data as any)?.results || [];
      const ok = results.filter((r: any) => r.status === "enviado").length;
      const fail = results.length - ok;
      if (ok > 0) toast.success(`${ok} e-mail(s) enviado(s)`);
      if (fail > 0) toast.error(`${fail} falha(s) — veja o histórico abaixo`);
      // refresh
      const { data: e } = await supabase.from("cotacao_envios").select("*").eq("cotacao_id", cot.id).order("created_at", { ascending: false });
      setEnvios(e || []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  const abrirWhatsApp = () => {
    if (selIds.length === 0) { toast.error("Selecione ao menos 1 fornecedor"); return; }
    const list = selIds
      .map(id => allFornecedores.find(f => f.id === id))
      .filter((f): f is any => !!f && !!f.telefone);
    if (list.length === 0) { toast.error("Nenhum fornecedor selecionado tem telefone cadastrado"); return; }
    setWaPanel(list);
  };

  const registrarEnvioWa = async (forn: any) => {
    await supabase.from("cotacao_envios").insert({
      cotacao_id: cot.id, fornecedor_id: forn.id, fornecedor_nome: forn.nome,
      fornecedor_email: forn.email, fornecedor_telefone: forn.telefone,
      canal: "whatsapp", status: "enviado",
    });
    const { data: e } = await supabase.from("cotacao_envios").select("*").eq("cotacao_id", cot.id).order("created_at", { ascending: false });
    setEnvios(e || []);
  };

  const waLink = (telefone: string) => {
    const num = (telefone || "").replace(/\D/g, "");
    const fone = num.startsWith("55") ? num : `55${num}`;
    return `https://wa.me/${fone}?text=${encodeURIComponent(buildMessage())}`;
  };

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Cotação COT {String(cot.numero).padStart(2, "0")} para fornecedores</DialogTitle>
        </DialogHeader>

        {waPanel ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Clique em cada fornecedor para abrir o WhatsApp com a mensagem pronta.</p>
              <Button variant="outline" size="sm" onClick={() => setWaPanel(null)}>Voltar</Button>
            </div>
            <div className="border rounded-md divide-y">
              {waPanel.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 gap-3">
                  <div>
                    <div className="font-medium">{f.nome}</div>
                    <div className="text-xs text-muted-foreground">{f.telefone}</div>
                  </div>
                  <Button asChild size="sm" onClick={() => registrarEnvioWa(f)}>
                    <a href={waLink(f.telefone)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" />Abrir WhatsApp <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-muted/40 p-3 rounded-md text-xs space-y-1">
              <p><b>E-mail:</b> envia automaticamente para todos os selecionados (requer domínio de envio configurado em Configurações &gt; E-mail).</p>
              <p><b>WhatsApp:</b> abre um link pronto por fornecedor selecionado — você confirma o envio em cada um (gratuito, não requer API paga).</p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
                <Input placeholder="Buscar fornecedor..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={() => toggleAll(true, "email")}>Selecionar todos com e-mail</Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(true, "whatsapp")}>Todos com WhatsApp</Button>
              <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>Limpar</Button>
            </div>

            <div className="border rounded-md max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-left">Fornecedor</th>
                    <th className="p-2 text-left">E-mail</th>
                    <th className="p-2 text-left">Telefone</th>
                    <th className="p-2 text-left">Último envio</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => {
                    const eM = lastEnvio(f.id, "email");
                    const wA = lastEnvio(f.id, "whatsapp");
                    return (
                      <tr key={f.id} className="border-t">
                        <td className="p-2"><Checkbox checked={!!selected[f.id]} onCheckedChange={(v) => setSelected({ ...selected, [f.id]: !!v })} /></td>
                        <td className="p-2 font-medium">{f.nome}</td>
                        <td className="p-2 text-xs">{f.email || <span className="text-muted-foreground italic">—</span>}</td>
                        <td className="p-2 text-xs">{f.telefone || <span className="text-muted-foreground italic">—</span>}</td>
                        <td className="p-2 text-xs space-y-0.5">
                          {eM && <div><Badge variant={eM.status === "enviado" ? "default" : "destructive"} className="text-[10px]"><Mail className="h-3 w-3 mr-1" />{eM.status}</Badge> <span className="text-muted-foreground">{new Date(eM.created_at).toLocaleDateString("pt-BR")}</span></div>}
                          {wA && <div><Badge variant="secondary" className="text-[10px]"><MessageCircle className="h-3 w-3 mr-1" />{wA.status}</Badge> <span className="text-muted-foreground">{new Date(wA.created_at).toLocaleDateString("pt-BR")}</span></div>}
                          {!eM && !wA && <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum fornecedor</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2 justify-end pt-4 border-t">
              <span className="text-sm text-muted-foreground mr-auto self-center">{selIds.length} selecionado(s)</span>
              <Button variant="outline" onClick={abrirWhatsApp} disabled={selIds.length === 0}>
                <MessageCircle className="h-4 w-4 mr-2" />Abrir WhatsApp dos selecionados
              </Button>
              <Button onClick={enviarEmail} disabled={selIds.length === 0 || sending}>
                <Mail className="h-4 w-4 mr-2" />{sending ? "Enviando..." : "Enviar e-mail aos selecionados"}
              </Button>
            </div>

            {envios.length > 0 && (
              <details className="border rounded-md p-3">
                <summary className="cursor-pointer text-sm font-medium">Histórico de envios ({envios.length})</summary>
                <div className="mt-2 space-y-1 text-xs">
                  {envios.map(e => (
                    <div key={e.id} className="flex items-center gap-2 border-b py-1">
                      <Badge variant={e.status === "enviado" ? "default" : "destructive"} className="text-[10px]">{e.canal} · {e.status}</Badge>
                      <span className="font-medium">{e.fornecedor_nome}</span>
                      <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                      {e.erro && <span className="text-destructive ml-2">{e.erro}</span>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
