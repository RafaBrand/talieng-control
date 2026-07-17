import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PageHeader } from "@/components/PageHeader";
import { CentroCustoSelect } from "@/components/CentroCustoSelect";
import { Plus, Trash2, ArrowLeft, FileDown, Save, FileSpreadsheet, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { brl } from "@/lib/format";
import { gerarPdfOrdem } from "@/lib/pdf";
import { gerarExcelOrdem } from "@/lib/excel";

type Item = { id?: string; insumo_id?: string | null; descricao: string; quantidade: number; unidade: string; preco_unitario: number };

export default function OrdemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [obras, setObras] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [fromCotacao, setFromCotacao] = useState(false);
  const [cotacaoNumero, setCotacaoNumero] = useState<number | null>(null);
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [forn, setForn] = useState<any>({});
  const [obraId, setObraId] = useState<string>("");
  const [centroCustoId, setCentroCustoId] = useState<string>("");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0, 10));
  const [comprador, setCompradorNome] = useState<string>("");
  const [contratoEmpr, setContratoEmpr] = useState("");
  const [ceiObra, setCeiObra] = useState("");
  const [freteTipo, setFreteTipo] = useState<"CIF" | "FOB">("CIF");
  const [freteValor, setFreteValor] = useState(0);
  const [ipi, setIpi] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [garantiaAnos, setGarantiaAnos] = useState<number | "">("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [condicoesEntrega, setCondicoesEntrega] = useState("");
  const [detalhePagamento, setDetalhePagamento] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [observacao, setObservacao] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [condicaoPagto, setCondicaoPagto] = useState("");
  const [numero, setNumero] = useState<number | null>(null);
  const [itens, setItens] = useState<Item[]>([{ descricao: "", quantidade: 1, unidade: "", preco_unitario: 0 }]);

  // CNPJ search
  const [cnpjBusca, setCnpjBusca] = useState("");

  useEffect(() => { (async () => {
    const { data: o } = await supabase.from("obras").select("id,nome,endereco,cliente").order("nome");
    setObras(o || []);
    const { data: ins } = await supabase.from("insumos").select("id,nome,codigo,unidade,categoria_id").order("nome");
    setInsumos(ins || []);
    // load profile for comprador
    if (user) {
      const { data: p } = await supabase.from("profiles").select("nome").eq("user_id", user.id).maybeSingle();
      setCompradorNome(p?.nome || user.email || "");
    }
  })(); }, [user]);

  useEffect(() => { if (id) loadExisting(id); /* eslint-disable-next-line */ }, [id]);

  const loadExisting = async (oid: string) => {
    const { data: o } = await supabase.from("ordens_compra").select("*").eq("id", oid).maybeSingle();
    if (!o) return;
    setNumero(o.numero); setObraId(o.obra_id || ""); setCentroCustoId(o.centro_custo_id || ""); setDataEmissao(o.data_emissao || o.created_at?.slice(0, 10));
    setContratoEmpr(o.contrato_empreiteiro || ""); setCeiObra(o.cei_obra || "");
    setFreteTipo((o.frete_tipo as any) || "CIF"); setFreteValor(Number(o.frete_valor) || 0);
    setIpi(Number(o.ipi) || 0); setDesconto(Number(o.desconto) || 0);
    setGarantiaAnos(o.garantia_anos ?? ""); setFormaPagamento(o.forma_pagamento || "");
    setCondicoesEntrega(o.condicoes_entrega || ""); setDetalhePagamento(o.detalhe_pagamento || "");
    setBanco(o.banco || ""); setAgencia(o.agencia || ""); setConta(o.conta || "");
    setObservacao(o.observacao || ""); setPrazoEntrega(o.prazo_entrega || "");
    setCondicaoPagto(o.condicao_pagamento || "");
    if (o.fornecedor_id) {
      const { data: f } = await supabase.from("fornecedores").select("*").eq("id", o.fornecedor_id).maybeSingle();
      if (f) { setFornecedorId(f.id); setForn(f); setCnpjBusca(f.cnpj || ""); }
    }
    const { data: its } = await supabase.from("ordem_itens").select("*").eq("ordem_id", oid).order("ordem");
    if (its && its.length) setItens(its.map(i => ({ id: i.id, descricao: i.descricao, quantidade: Number(i.quantidade), unidade: i.unidade || "", preco_unitario: Number(i.preco_unitario) })));
  };

  // Load from cotacao for new OC
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cotacaoId = params.get("cotacao");
    const fornCotId = params.get("fornecedor"); // cotacao_fornecedor_id
    if (!id && cotacaoId) loadFromCotacao(cotacaoId, fornCotId);
    // eslint-disable-next-line
  }, [id]);

  const loadFromCotacao = async (cotacaoId: string, fornCotId: string | null) => {
    const [{ data: cotRaw, error: cotError }, { data: itens, error: itensError }, { data: forns, error: fornsError }] = await Promise.all([
      supabase.from("cotacoes").select("*").eq("id", cotacaoId).maybeSingle(),
      supabase.from("cotacao_itens").select("*").eq("cotacao_id", cotacaoId).order("ordem"),
      supabase.from("cotacao_fornecedores").select("*, fornecedores(*)").eq("cotacao_id", cotacaoId).order("ordem"),
    ]);
    if (cotError || itensError || fornsError) {
      toast.error(cotError?.message || itensError?.message || fornsError?.message || "Erro ao carregar cotação");
      return;
    }
    if (!cotRaw) { toast.error("Cotação não encontrada"); return; }

    const itemIds = (itens || []).map((it: any) => it.id);
    const fornIds = (forns || []).map((f: any) => f.id);
    const [{ data: precos, error: precosError }, { data: decisoesRaw, error: decisoesError }] = await Promise.all([
      fornIds.length ? supabase.from("cotacao_precos").select("*").in("cotacao_fornecedor_id", fornIds) : Promise.resolve({ data: [], error: null } as any),
      itemIds.length ? supabase.from("cotacao_decisao").select("*").in("cotacao_item_id", itemIds) : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (precosError || decisoesError) {
      toast.error(precosError?.message || decisoesError?.message || "Erro ao carregar preços da cotação");
      return;
    }

    const cot: any = {
      ...cotRaw,
      cotacao_itens: itens || [],
      cotacao_fornecedores: forns || [],
      cotacao_precos: precos || [],
      cotacao_decisao: decisoesRaw || [],
    };
    setObraId(cot.obra_id || "");
    if (cot.centro_custo_id) setCentroCustoId(cot.centro_custo_id);
    else if (cot.obra_id) {
      const { data: cc } = await supabase.from("centros_custo").select("id").eq("obra_id", cot.obra_id).eq("ativo", true).limit(1).maybeSingle();
      if (cc?.id) setCentroCustoId(cc.id);
    }
    setCotacaoNumero(cot.numero ?? null);
    let cotForn: any = (cot.cotacao_fornecedores || []).find((f: any) => f.id === fornCotId) || (cot.cotacao_fornecedores || [])[0];
    if (!cotForn) { toast.error("Cotação sem fornecedor vinculado"); return; }
    if (cotForn?.fornecedores) {
      setFornecedorId(cotForn.fornecedor_id); setForn(cotForn.fornecedores); setCnpjBusca(cotForn.fornecedores.cnpj || "");
    }
    setCondicaoPagto(cotForn?.condicao_pagamento || "");
    const decisoes: any[] = (cot.cotacao_decisao || []).filter((d: any) => d.cotacao_fornecedor_id === cotForn?.id);
    // Se há decisão, usa só os itens decididos; senão, usa todos os itens com preço deste fornecedor
    const fonte = decisoes.length
      ? decisoes.map((d: any) => ({ item_id: d.cotacao_item_id }))
      : (cot.cotacao_itens || []).map((it: any) => ({ item_id: it.id }));
    const its: Item[] = fonte.map((&: any) => {
      const it: any = (cot.cotacao_itens || []).find((x: any) => x.id === item_id);
      const pr: any = (cot.cotacao_precos || []).find((p: any) => p.cotacao_item_id === item_id && p.cotacao_fornecedor_id === cotForn.id);
      return { descricao: it?.item || "", quantidade: Number(it?.quantidade || 1), unidade: it?.unidade || "", preco_unitario: Number(pr?.preco_unitario || 0) };
    }).filter(i => i.descricao);
    if (its.length) { setItens(its); setFromCotacao(true); }
  };


  const buscarFornecedor = async () => {
    if (!cnpjBusca.trim()) return;
    const { data } = await supabase.from("fornecedores").select("*").ilike("cnpj", `%${cnpjBusca.trim()}%`).limit(1).maybeSingle();
    if (data) { setFornecedorId(data.id); setForn(data); toast.success("Fornecedor encontrado"); }
    else { toast.message("Fornecedor não cadastrado — preencha manualmente."); setFornecedorId(null); }
  };

  const subtotal = useMemo(() => itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.preco_unitario) || 0), 0), [itens]);
  const total = subtotal + Number(freteValor || 0) + Number(ipi || 0) - Number(desconto || 0);

  const salvar = async (gerarPdf = false) => {
    if (!fornecedorId && !forn.nome) { toast.error("Informe o fornecedor"); return null; }
    if (!obraId) { toast.error("Selecione a obra"); return null; }
    if (!centroCustoId) { toast.error("Selecione o centro de custo"); return null; }
    if (itens.filter(i => i.descricao.trim()).length === 0) { toast.error("Adicione ao menos um item"); return null; }
    const payload: any = {
      fornecedor_id: fornecedorId, obra_id: obraId, centro_custo_id: centroCustoId, data_emissao: dataEmissao,
      comprador_id: user?.id, contrato_empreiteiro: contratoEmpr || null, cei_obra: ceiObra || null,
      frete_tipo: freteTipo, frete_valor: Number(freteValor) || 0, ipi: Number(ipi) || 0, desconto: Number(desconto) || 0,
      garantia_anos: garantiaAnos === "" ? null : Number(garantiaAnos),
      forma_pagamento: formaPagamento || null, condicoes_entrega: condicoesEntrega || null,
      detalhe_pagamento: detalhePagamento || null, banco: banco || null, agencia: agencia || null, conta: conta || null,
      observacao: observacao || null, prazo_entrega: prazoEntrega || null, condicao_pagamento: condicaoPagto || null,
      preco_unitario: subtotal, quantidade: 1,
    };
    const cotacaoId = new URLSearchParams(window.location.search).get("cotacao");
    if (!id && fromCotacao && cotacaoId) payload.cotacao_id = cotacaoId;
    let ordemId = id || null;
    if (id) {
      const { error } = await supabase.from("ordens_compra").update(payload).eq("id", id);
      if (error) { toast.error(error.message); return null; }
      await supabase.from("ordem_itens").delete().eq("ordem_id", id);
    } else {
      payload.status = "ag_talieng";
      const { data, error } = await supabase.from("ordens_compra").insert(payload).select("id, numero").single();
      if (error || !data) { toast.error(error?.message || "Erro"); return null; }
      ordemId = data.id; setNumero(data.numero);
    }
    const itensIns = itens.filter(i => i.descricao.trim()).map((i, idx) => ({
      ordem_id: ordemId!, ordem: idx, descricao: i.descricao,
      quantidade: Number(i.quantidade) || 1, unidade: i.unidade || null,
      preco_unitario: Number(i.preco_unitario) || 0,
    }));
    if (itensIns.length) {
      const { error: itensError } = await supabase.from("ordem_itens").insert(itensIns);
      if (itensError) { toast.error(itensError.message); return null; }
    }
    if (fromCotacao && ordemId) {
      if (cotacaoId) await supabase.from("cotacoes").update({ status: "convertida" }).eq("id", cotacaoId);
    }
    toast.success("Ordem salva");
    if (gerarPdf && ordemId) await gerarPdfOrdem(ordemId);
    return ordemId;
  };

  return (
    <div>
      <PageHeader title={id ? `Editar Ordem ${numero ? `OC ${String(numero).padStart(2, "0")}` : ""}` : "Nova Ordem de Compra"} action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/ordens")}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
          <Button variant="outline" onClick={() => salvar(true)}><FileDown className="h-4 w-4 mr-2" />Salvar + PDF</Button>
          <Button variant="outline" onClick={async () => { const oid = await salvar(false); if (oid) await gerarExcelOrdem(oid); }}><FileSpreadsheet className="h-4 w-4 mr-2" />Salvar + Excel</Button>
          <Button onClick={() => salvar(false)}><Save className="h-4 w-4 mr-2" />Salvar</Button>
        </div>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Dados do Fornecedor</h3>
          <div className="flex gap-2">
            <Input placeholder="CNPJ — pesquisar cadastrado" value={cnpjBusca} onChange={e => setCnpjBusca(e.target.value)} />
            <Button type="button" variant="outline" onClick={buscarFornecedor}>Buscar</Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Razão Social / Nome</Label><Input value={forn.nome || ""} onChange={e => setForn({ ...forn, nome: e.target.value })} /></div>
            <div><Label>Contato</Label><Input value={forn.contato || ""} onChange={e => setForn({ ...forn, contato: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={forn.telefone || ""} onChange={e => setForn({ ...forn, telefone: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input value={forn.email || ""} onChange={e => setForn({ ...forn, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>Endereço</Label><Input value={forn.endereco || ""} onChange={e => setForn({ ...forn, endereco: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={forn.cidade || ""} onChange={e => setForn({ ...forn, cidade: e.target.value })} /></div>
            <div><Label>UF</Label><Input value={forn.uf || ""} onChange={e => setForn({ ...forn, uf: e.target.value })} /></div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Dados da OC</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Número</Label><Input value={numero ? `OC ${String(numero).padStart(2, "0")}` : "(automático)"} disabled /></div>
            <div><Label>Data</Label><Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} /></div>
            <div className="col-span-2"><Label>Comprador</Label><Input value={comprador} onChange={e => setCompradorNome(e.target.value)} /></div>
            <div className="col-span-2">
              <Label>Obra / Local de entrega *</Label>
              <Select value={obraId} onValueChange={(v) => { setObraId(v); setCentroCustoId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Centro de Custo *</Label>
              <CentroCustoSelect value={centroCustoId} onValueChange={setCentroCustoId} obraId={obraId || null} required />
            </div>
            <div><Label>Contrato de empreiteiro</Label><Input value={contratoEmpr} onChange={e => setContratoEmpr(e.target.value)} /></div>
            <div><Label>C.E.I. da obra</Label><Input value={ceiObra} onChange={e => setCeiObra(e.target.value)} /></div>
          </div>
        </Card>
      </div>

      <Card className="p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">Itens</h3>
            {fromCotacao && (
              <p className="text-xs text-muted-foreground mt-1">
                Itens vindos da cotação {cotacaoNumero ? `COT ${String(cotacaoNumero).padStart(2, "0")}` : ""} — bloqueados.
                Para alterar valores, edite a cotação.
              </p>
            )}
          </div>
          {!fromCotacao && (
            <Button size="sm" variant="outline" onClick={() => setItens([...itens, { descricao: "", quantidade: 1, unidade: "", preco_unitario: 0 }])}>
              <Plus className="h-3 w-3 mr-1" />Adicionar item
            </Button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr><th className="text-left p-1 w-10">#</th><th className="text-left p-1">Descrição</th><th className="text-left p-1 w-20">Qtde</th><th className="text-left p-1 w-24">Unidade</th><th className="text-left p-1 w-32">Unitário</th><th className="text-left p-1 w-32">Total</th><th className="w-10"></th></tr>
          </thead>
          <tbody>
            {itens.map((it, i) => (
              <tr key={i} className="border-t">
                <td className="p-1">{i + 1}</td>
                <td className="p-1">
                  {fromCotacao ? (
                    <Input value={it.descricao} readOnly disabled />
                  ) : (
                    <InsumoPicker
                      insumos={insumos}
                      value={it}
                      onChange={(patch) => { const c = [...itens]; c[i] = { ...c[i], ...patch }; setItens(c); }}
                    />
                  )}
                </td>
                <td className="p-1"><Input type="number" step="0.01" value={it.quantidade} readOnly={fromCotacao} disabled={fromCotacao} onChange={e => { const c = [...itens]; c[i].quantidade = Number(e.target.value); setItens(c); }} /></td>
                <td className="p-1"><Input value={it.unidade} readOnly={fromCotacao} disabled={fromCotacao} onChange={e => { const c = [...itens]; c[i].unidade = e.target.value; setItens(c); }} /></td>
                <td className="p-1"><Input type="number" step="0.01" value={it.preco_unitario} readOnly={fromCotacao} disabled={fromCotacao} onChange={e => { const c = [...itens]; c[i].preco_unitario = Number(e.target.value); setItens(c); }} /></td>
                <td className="p-1 font-medium">{brl(it.quantidade * it.preco_unitario)}</td>
                <td className="p-1">
                  {!fromCotacao && (
                    <Button size="icon" variant="ghost" disabled={itens.length === 1} onClick={() => setItens(itens.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Frete</h3>
          <RadioGroup value={freteTipo} onValueChange={(v: any) => setFreteTipo(v)} className="flex gap-4">
            <label className="flex items-center gap-2"><RadioGroupItem value="CIF" />CIF</label>
            <label className="flex items-center gap-2"><RadioGroupItem value="FOB" />FOB</label>
          </RadioGroup>
          <div><Label>Valor do frete (R$)</Label><Input type="number" step="0.01" value={freteValor} onChange={e => setFreteValor(Number(e.target.value))} /></div>
          <div><Label>I.P.I. (R$)</Label><Input type="number" step="0.01" value={ipi} onChange={e => setIpi(Number(e.target.value))} /></div>
          <div><Label>Desconto (R$)</Label><Input type="number" step="0.01" value={desconto} onChange={e => setDesconto(Number(e.target.value))} /></div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Detalhe sobre o pagamento</h3>
          <div><Label>Banco</Label><Input value={banco} onChange={e => setBanco(e.target.value)} /></div>
          <div><Label>Agência</Label><Input value={agencia} onChange={e => setAgencia(e.target.value)} /></div>
          <div><Label>Conta nº</Label><Input value={conta} onChange={e => setConta(e.target.value)} /></div>
          <div><Label>Detalhe livre</Label><Textarea rows={2} value={detalhePagamento} onChange={e => setDetalhePagamento(e.target.value)} /></div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Forma de pagamento e entrega</h3>
          <div><Label>Forma de pagamento</Label><Input value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} placeholder="Ex: Boleto 30 dias" /></div>
          <div><Label>Condição (cotação)</Label><Input value={condicaoPagto} onChange={e => setCondicaoPagto(e.target.value)} placeholder="Ex: 30/60/90" /></div>
          <div><Label>Condições de entrega</Label><Textarea rows={2} value={condicoesEntrega} onChange={e => setCondicoesEntrega(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Data de entrega</Label><Input type="date" value={prazoEntrega} onChange={e => setPrazoEntrega(e.target.value)} /></div>
            <div><Label>Garantia (anos)</Label><Input type="number" value={garantiaAnos} onChange={e => setGarantiaAnos(e.target.value === "" ? "" : Number(e.target.value))} /></div>
          </div>
        </Card>
      </div>

      <Card className="p-4 mt-4">
        <div className="flex justify-between items-center">
          <div className="flex-1"><Label>Observações</Label><Textarea rows={3} value={observacao} onChange={e => setObservacao(e.target.value)} /></div>
          <div className="ml-6 min-w-[200px] space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Frete</span><span>{brl(freteValor)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>I.P.I.</span><span>{brl(ipi)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Desconto</span><span>- {brl(desconto)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>TOTAL</span><span>{brl(total)}</span></div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function InsumoPicker({ insumos, value, onChange }: { insumos: any[]; value: Item; onChange: (p: Partial<Item>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full justify-between font-normal">
          <span className={cn("truncate", !value.descricao && "text-muted-foreground")}>
            {value.descricao || "Selecionar insumo cadastrado..."}
          </span>
          <Search className="h-4 w-4 ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <Command>
          <CommandInput placeholder="Buscar insumo por nome ou código..." />
          <CommandList>
            <CommandEmpty>Nenhum insumo encontrado. Cadastre em Insumos.</CommandEmpty>
            <CommandGroup>
              {insumos.map(i => (
                <CommandItem key={i.id} value={`${i.nome} ${i.codigo || ""}`} onSelect={() => {
                  onChange({ insumo_id: i.id, descricao: i.nome, unidade: i.unidade || "" });
                  setOpen(false);
                }}>
                  <Check className={cn("mr-2 h-4 w-4", value.insumo_id === i.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-medium">{i.nome}</span>
                    <span className="text-xs text-muted-foreground">{i.codigo || "—"} · {i.unidade || "—"}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
