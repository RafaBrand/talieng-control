import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CentroCustoSelect } from "@/components/CentroCustoSelect";
import { Plus, Trash2, Check, Search, Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";
import { brl, fmtDate } from "@/lib/format";

type Props = { tipo: "pagar" | "receber" };
const TIPO_LABEL: Record<string, string> = { material: "Material", mao_de_obra: "Mão de Obra", imposto: "Imposto" };

export default function Contas({ tipo }: Props) {
  const tabela = tipo === "pagar" ? "contas_pagar" : "contas_receber";
  const titulo = tipo === "pagar" ? "Contas a Pagar" : "Contas a Receber";
  const statusFinal = tipo === "pagar" ? "pago" : "recebido";
  const dataField = tipo === "pagar" ? "data_pagamento" : "data_recebimento";

  const [items, setItems] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova {tipo === "pagar" ? "conta a pagar" : "conta a receber"}</DialogTitle></DialogHeader>
            {tipo === "pagar" ? (
              <NovaContaPagar obras={obras} fornecedores={fornecedores} onSaved={() => { setOpen(false); load(); }} />
            ) : (
              <NovaContaReceber obras={obras} onSaved={() => { setOpen(false); load(); }} />
            )}
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
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>{tipo === "pagar" ? "Fornecedor" : "Cliente"}</TableHead>
              <TableHead>Obra</TableHead>
              {tipo === "pagar" && <TableHead>Categoria</TableHead>}
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={tipo === "pagar" ? 8 : 7} className="text-center text-muted-foreground py-8">Nenhuma conta</TableCell></TableRow>}
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.descricao}</TableCell>
                <TableCell>{tipo === "pagar" ? (c.fornecedores?.nome || "—") : (c.cliente || "—")}</TableCell>
                <TableCell>{c.obras?.nome || "—"}</TableCell>
                {tipo === "pagar" && (
                  <TableCell>
                    {c.categoria_conta ? <Badge variant="outline">{TIPO_LABEL[c.categoria_conta]}</Badge> : "—"}
                    {c.modo_lancamento && c.modo_lancamento !== "integral" && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">{c.modo_lancamento}</Badge>
                    )}
                  </TableCell>
                )}
                <TableCell className={`font-semibold ${tipo === "pagar" ? "text-destructive" : "text-success"}`}>{brl(c.valor)}</TableCell>
                <TableCell>{fmtDate(c.vencimento)}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell>
                  <div className="flex gap-1 items-center">
                    {tipo === "pagar" && <AnexosLinks conta={c} />}
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

function AnexosLinks({ conta }: { conta: any }) {
  const openPath = async (path: string) => {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };
  if (!conta.nota_fiscal_path && !conta.boleto_path) return null;
  return (
    <div className="flex gap-1">
      {conta.nota_fiscal_path && <Button size="icon" variant="ghost" title="Nota fiscal" onClick={() => openPath(conta.nota_fiscal_path)}><Paperclip className="h-4 w-4" /></Button>}
      {conta.boleto_path && <Button size="icon" variant="ghost" title="Boleto" onClick={() => openPath(conta.boleto_path)}><Paperclip className="h-4 w-4 text-primary" /></Button>}
    </div>
  );
}

function NovaContaReceber({ obras, onSaved }: { obras: any[]; onSaved: () => void }) {
  const [obraSel, setObraSel] = useState("");
  const [ccId, setCcId] = useState("");
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!ccId) { toast.error("Selecione o centro de custo"); return; }
    const { error } = await supabase.from("contas_receber").insert({
      descricao: String(fd.get("descricao")),
      valor: Number(fd.get("valor")),
      vencimento: String(fd.get("vencimento")),
      obra_id: obraSel || null,
      centro_custo_id: ccId,
      cliente: String(fd.get("cliente") || "") || null,
    } as any);
    if (error) toast.error(error.message); else { toast.success("Salvo"); onSaved(); }
  };
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><Label>Descrição *</Label><Input name="descricao" required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor *</Label><Input name="valor" type="number" step="0.01" required /></div>
        <div><Label>Vencimento *</Label><Input name="vencimento" type="date" required /></div>
      </div>
      <div><Label>Cliente</Label><Input name="cliente" /></div>
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
  );
}

function NovaContaPagar({ obras, fornecedores, onSaved }: { obras: any[]; fornecedores: any[]; onSaved: () => void }) {
  const [origem, setOrigem] = useState<"com_oc" | "sem_oc">("com_oc");
  return (
    <div className="space-y-4">
      <RadioGroup value={origem} onValueChange={(v: any) => setOrigem(v)} className="grid grid-cols-2 gap-2">
        <label className={`border rounded-md p-3 cursor-pointer flex items-center gap-2 ${origem === "com_oc" ? "border-primary bg-primary/5" : ""}`}>
          <RadioGroupItem value="com_oc" /> Com Ordem de Compra
        </label>
        <label className={`border rounded-md p-3 cursor-pointer flex items-center gap-2 ${origem === "sem_oc" ? "border-primary bg-primary/5" : ""}`}>
          <RadioGroupItem value="sem_oc" /> Sem Ordem de Compra (avulso)
        </label>
      </RadioGroup>
      {origem === "com_oc" ? <FormComOC onSaved={onSaved} /> : <FormSemOC obras={obras} fornecedores={fornecedores} onSaved={onSaved} />}
    </div>
  );
}

function FormComOC({ onSaved }: { onSaved: () => void }) {
  const [ocs, setOcs] = useState<any[]>([]);
  const [ocId, setOcId] = useState<string>("");
  const [oc, setOc] = useState<any>(null);
  const [ocItens, setOcItens] = useState<any[]>([]);
  const [modo, setModo] = useState<"integral" | "parcial">("integral");
  const [descricao, setDescricao] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [frete, setFrete] = useState(0);
  const [parciais, setParciais] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ordens_compra")
        .select("id, numero, total, fornecedor_id, obra_id, centro_custo_id, tipo_compra, faturamento_direto, prazo_entrega, condicao_pagamento, fornecedores(nome)")
        .eq("faturamento_direto", true)
        .order("numero", { ascending: false });
      setOcs(data || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!ocId) { setOc(null); setOcItens([]); return; }
      const [{ data: o }, { data: its }] = await Promise.all([
        supabase.from("ordens_compra").select("*, fornecedores(nome)").eq("id", ocId).maybeSingle(),
        supabase.from("ordem_itens").select("*").eq("ordem_id", ocId).order("ordem"),
      ]);
      setOc(o); setOcItens(its || []);
      setDescricao(`OC #${String(o?.numero || 0).padStart(5, "0")}`);
      // sugerir vencimento
      const dias = Number((o?.condicao_pagamento || "").replace(/\D/g, "")) || 30;
      const base = o?.prazo_entrega ? new Date(o.prazo_entrega) : new Date();
      base.setDate(base.getDate() + dias);
      setVencimento(base.toISOString().slice(0, 10));
      setParciais({});
    })();
  }, [ocId]);

  const totalParcial = useMemo(() => {
    return ocItens.reduce((s, it) => s + (Number(parciais[it.id] || 0) * Number(it.preco_unitario || 0)), 0) + Number(frete || 0);
  }, [ocItens, parciais, frete]);

  const salvar = async () => {
    if (!oc) { toast.error("Selecione uma OC"); return; }
    if (!vencimento) { toast.error("Informe vencimento"); return; }
    const valor = modo === "integral" ? Number(oc.total || 0) : totalParcial;
    if (valor <= 0) { toast.error("Valor deve ser maior que zero"); return; }
    const payload: any = {
      descricao,
      valor,
      vencimento,
      status: "pendente",
      fornecedor_id: oc.fornecedor_id,
      obra_id: oc.obra_id,
      centro_custo_id: oc.centro_custo_id,
      ordem_compra_id: oc.id,
      tipo_compra: oc.tipo_compra,
      categoria_conta: oc.tipo_compra === "mao_de_obra" ? "mao_de_obra" : "material",
      modo_lancamento: modo,
    };
    const { error } = await supabase.from("contas_pagar").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta lançada");
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Ordem de Compra *</Label>
        <Select value={ocId} onValueChange={setOcId}>
          <SelectTrigger><SelectValue placeholder="Selecione OC (apenas com Faturamento Direto)" /></SelectTrigger>
          <SelectContent>
            {ocs.length === 0 && <div className="p-2 text-xs text-muted-foreground">Nenhuma OC de faturamento direto disponível. OCs normais já geram conta automaticamente.</div>}
            {ocs.map(o => (
              <SelectItem key={o.id} value={o.id}>
                OC {String(o.numero).padStart(2, "0")} — {o.fornecedores?.nome || "—"} — {brl(o.total)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {oc && (
        <>
          <div className="grid grid-cols-3 gap-2 text-xs bg-muted/50 rounded-md p-2">
            <div><span className="text-muted-foreground">Fornecedor:</span> {oc.fornecedores?.nome || "—"}</div>
            <div><span className="text-muted-foreground">Tipo:</span> {TIPO_LABEL[oc.tipo_compra] || "—"}</div>
            <div><span className="text-muted-foreground">Total OC:</span> <b>{brl(oc.total)}</b></div>
          </div>

          <RadioGroup value={modo} onValueChange={(v: any) => setModo(v)} className="grid grid-cols-2 gap-2">
            <label className={`border rounded-md p-2 cursor-pointer flex items-center gap-2 text-sm ${modo === "integral" ? "border-primary" : ""}`}>
              <RadioGroupItem value="integral" /> Integral
            </label>
            <label className={`border rounded-md p-2 cursor-pointer flex items-center gap-2 text-sm ${modo === "parcial" ? "border-primary" : ""}`}>
              <RadioGroupItem value="parcial" /> Parcial
            </label>
          </RadioGroup>

          {modo === "parcial" && (
            <div className="border rounded-md p-2">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr><th className="text-left">Item</th><th>Qtd OC</th><th>Unitário</th><th>Qtd nesta parcela</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                  {ocItens.map(it => (
                    <tr key={it.id} className="border-t">
                      <td className="py-1">{it.descricao}</td>
                      <td className="text-center">{it.quantidade} {it.unidade}</td>
                      <td className="text-center">{brl(it.preco_unitario)}</td>
                      <td className="text-center">
                        <Input className="h-7 w-20 mx-auto" type="number" step="0.01" min={0} max={Number(it.quantidade)}
                          value={parciais[it.id] ?? ""} onChange={e => setParciais({ ...parciais, [it.id]: Number(e.target.value) })} />
                      </td>
                      <td className="text-center font-medium">{brl(Number(parciais[it.id] || 0) * Number(it.preco_unitario))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                <Label className="text-xs">Frete R$</Label>
                <Input type="number" step="0.01" className="h-7 w-32" value={frete} onChange={e => setFrete(Number(e.target.value))} />
                <div className="ml-auto text-sm font-semibold">Total parcela: {brl(totalParcial)}</div>
              </div>
            </div>
          )}

          <div><Label>Descrição *</Label><Input value={descricao} onChange={e => setDescricao(e.target.value)} required /></div>
          <div><Label>Vencimento *</Label><Input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} required /></div>
          <Button onClick={salvar} className="w-full">Lançar conta</Button>
        </>
      )}
    </div>
  );
}

function FormSemOC({ obras, fornecedores, onSaved }: { obras: any[]; fornecedores: any[]; onSaved: () => void }) {
  const [categoria, setCategoria] = useState<"material" | "mao_de_obra" | "imposto">("material");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<number>(0);
  const [vencimento, setVencimento] = useState("");
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [obraSel, setObraSel] = useState("");
  const [ccId, setCcId] = useState("");
  const [notaFiscal, setNotaFiscal] = useState<File | null>(null);
  const [boleto, setBoleto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const upload = async (file: File | null, prefix: string): Promise<string | null> => {
    if (!file) return null;
    const path = `contas_pagar/${prefix}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: false });
    if (error) { toast.error(`Upload ${prefix}: ${error.message}`); return null; }
    return path;
  };

  const salvar = async () => {
    if (!descricao || !valor || !vencimento || !ccId) { toast.error("Preencha os campos obrigatórios"); return; }
    setSaving(true);
    try {
      const [nfPath, boPath] = await Promise.all([upload(notaFiscal, "nf"), upload(boleto, "boleto")]);
      const payload: any = {
        descricao, valor, vencimento, status: "pendente",
        fornecedor_id: fornecedorId || null,
        obra_id: obraSel || null,
        centro_custo_id: ccId,
        tipo_compra: categoria === "imposto" ? null : categoria,
        categoria_conta: categoria,
        modo_lancamento: "avulso",
        nota_fiscal_path: nfPath,
        boleto_path: boPath,
      };
      const { error } = await supabase.from("contas_pagar").insert(payload);
      if (error) throw error;
      toast.success("Conta lançada");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Categoria *</Label>
        <Select value={categoria} onValueChange={(v: any) => setCategoria(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="material">Material</SelectItem>
            <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
            <SelectItem value="imposto">Imposto (DAS)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Descrição *</Label><Input value={descricao} onChange={e => setDescricao(e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor *</Label><Input type="number" step="0.01" value={valor} onChange={e => setValor(Number(e.target.value))} required /></div>
        <div><Label>Vencimento *</Label><Input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} required /></div>
      </div>
      {categoria !== "imposto" && (
        <div>
          <Label>Fornecedor</Label>
          <Select value={fornecedorId} onValueChange={setFornecedorId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="flex items-center gap-1"><Upload className="h-3 w-3" />Nota Fiscal</Label>
          <Input type="file" onChange={e => setNotaFiscal(e.target.files?.[0] || null)} />
        </div>
        <div>
          <Label className="flex items-center gap-1"><Upload className="h-3 w-3" />Boleto</Label>
          <Input type="file" onChange={e => setBoleto(e.target.files?.[0] || null)} />
        </div>
      </div>
      <Button onClick={salvar} className="w-full" disabled={saving}>{saving ? "Salvando..." : "Lançar conta"}</Button>
    </div>
  );
}
