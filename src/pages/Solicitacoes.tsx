import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CentroCustoSelect } from "@/components/CentroCustoSelect";
import { Plus, Trash2, Search, ChevronDown, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS = ["aberta", "em_cotacao"];
const STATUS_LABEL: Record<string, string> = { aberta: "Aberta", em_cotacao: "Em Cotação" };
const URG = ["baixa", "normal", "alta", "urgente"];

type ItemRow = { insumo_id: string | null; item: string; quantidade: string; unidade: string; observacao: string };
const emptyRow = (): ItemRow => ({ insumo_id: null, item: "", quantidade: "1", unidade: "", observacao: "" });

export default function Solicitacoes() {
  const [items, setItems] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [obraSel, setObraSel] = useState<string>("");
  const [ccId, setCcId] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [q, setQ] = useState("");
  const [fObra, setFObra] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fUrg, setFUrg] = useState<string>("all");

  const load = async () => {
    const [{ data }, { data: o }, { data: ins }] = await Promise.all([
      supabase.from("solicitacoes_compra").select("*, obras(nome), solicitacao_itens(*)").order("numero", { ascending: false }),
      supabase.from("obras").select("id,nome").order("nome"),
      supabase.from("insumos").select("id,nome,codigo,unidade,categoria_id").order("nome"),
    ]);
    setItems(data || []); setObras(o || []); setInsumos(ins || []);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!obraSel) { toast.error("Selecione a obra"); return; }
    if (!ccId) { toast.error("Selecione o centro de custo"); return; }
    const validRows = rows.filter(r => r.item.trim());
    if (validRows.length === 0) { toast.error("Adicione ao menos um item"); return; }
    const { data: sol, error } = await supabase.from("solicitacoes_compra").insert({
      obra_id: obraSel,
      centro_custo_id: ccId,
      titulo: String(fd.get("titulo") || "") || null,
      urgencia: String(fd.get("urgencia")),
      observacao: String(fd.get("observacao") || "") || null,
    }).select("id, numero").single();
    if (error || !sol) { toast.error(error?.message || "Erro"); return; }
    const { error: e2 } = await supabase.from("solicitacao_itens").insert(
      validRows.map(r => ({
        solicitacao_id: sol.id,
        insumo_id: r.insumo_id,
        item: r.item,
        quantidade: Number(r.quantidade) || 1,
        unidade: r.unidade || null,
        observacao: r.observacao || null,
      }))
    );
    if (e2) { toast.error(e2.message); return; }
    toast.success(`SC ${String(sol.numero).padStart(2, "0")} criada`); setOpen(false); setRows([emptyRow()]); setObraSel(""); setCcId(""); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from("solicitacoes_compra").delete().eq("id", id); load();
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter(s => {
      if (fObra !== "all" && s.obra_id !== fObra) return false;
      if (fStatus !== "all" && s.status !== fStatus) return false;
      if (fUrg !== "all" && s.urgencia !== fUrg) return false;
      if (!term) return true;
      const inNum = String(s.numero || "").includes(term);
      const inTitle = (s.titulo || "").toLowerCase().includes(term);
      const inObra = (s.obras?.nome || "").toLowerCase().includes(term);
      const inItems = (s.solicitacao_itens || []).some((it: any) => (it.item || "").toLowerCase().includes(term));
      return inNum || inTitle || inObra || inItems;
    });
  }, [items, q, fObra, fStatus, fUrg]);

  return (
    <div>
      <PageHeader title="Solicitações de Compra" description="Pedidos de materiais e serviços por obra" action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setRows([emptyRow()]); setObraSel(""); setCcId(""); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova solicitação</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Obra *</Label>
                  <Select value={obraSel} onValueChange={(v) => { setObraSel(v); setCcId(""); }} required>
                    <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                    <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Centro de Custo *</Label>
                  <CentroCustoSelect value={ccId} onValueChange={setCcId} obraId={obraSel || null} required />
                </div>
                <div>
                  <Label>Urgência</Label>
                  <Select name="urgencia" defaultValue="normal">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{URG.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Título / referência</Label><Input name="titulo" placeholder="Ex: Materiais hidráulicos lote 1" /></div>


              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Itens *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setRows([...rows, emptyRow()])}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar item
                  </Button>
                </div>
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md border bg-muted/30">
                      <div className="col-span-12 md:col-span-5">
                        <InsumoCombo insumos={insumos} value={r} onChange={(patch) => {
                          const c = [...rows]; c[i] = { ...c[i], ...patch }; setRows(c);
                        }} />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Input type="number" step="0.01" placeholder="Qtd" value={r.quantidade} onChange={e => { const c = [...rows]; c[i].quantidade = e.target.value; setRows(c); }} />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Input placeholder="Unidade" value={r.unidade} onChange={e => { const c = [...rows]; c[i].unidade = e.target.value; setRows(c); }} />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <Input placeholder="Obs" value={r.observacao} onChange={e => { const c = [...rows]; c[i].observacao = e.target.value; setRows(c); }} />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button type="button" size="icon" variant="ghost" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, x) => x !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pesquise o insumo cadastrado por nome ou código, ou digite livremente.</p>
              </div>

              <div><Label>Observação geral</Label><Textarea name="observacao" rows={2} /></div>
              <Button type="submit" className="w-full">Criar solicitação</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <Card className="p-3 mb-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
            <Input placeholder="Buscar por nº, título, obra ou item..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fObra} onValueChange={setFObra}>
            <SelectTrigger><SelectValue placeholder="Obra" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as obras</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos status</SelectItem>{STATUS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fUrg} onValueChange={setFUrg}>
            <SelectTrigger><SelectValue placeholder="Urgência" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Toda urgência</SelectItem>{URG.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Nº</TableHead><TableHead>Título</TableHead><TableHead>Obra</TableHead><TableHead>Itens</TableHead><TableHead>Urgência</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma solicitação</TableCell></TableRow>}
            {filtered.map(s => {
              const isOpen = !!expanded[s.id];
              const its = s.solicitacao_itens || [];
              return (
                <>
                  <TableRow key={s.id}>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setExpanded({ ...expanded, [s.id]: !isOpen })}>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold text-primary">SC {String(s.numero || 0).padStart(2, "0")}</TableCell>
                    <TableCell className="font-medium">{s.titulo || "—"}</TableCell>
                    <TableCell>{s.obras?.nome || "—"}</TableCell>
                    <TableCell>{its.length}</TableCell>
                    <TableCell><StatusBadge status={s.urgencia} /></TableCell>
                    <TableCell><StatusBadge status={STATUS_LABEL[s.status] || s.status} /></TableCell>
                    <TableCell>{fmtDate(s.created_at?.slice(0, 10))}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={s.id + "-d"} className="bg-muted/30">
                      <TableCell colSpan={9}>
                        <div className="p-2">
                          {its.length === 0 ? <p className="text-sm text-muted-foreground">Sem itens</p> : (
                            <table className="w-full text-sm">
                              <thead className="text-muted-foreground"><tr><th className="text-left py-1">Item</th><th className="text-left py-1">Qtd</th><th className="text-left py-1">Unidade</th><th className="text-left py-1">Observação</th></tr></thead>
                              <tbody>
                                {its.map((it: any) => (
                                  <tr key={it.id} className="border-t"><td className="py-1">{it.item}</td><td>{it.quantidade}</td><td>{it.unidade || "—"}</td><td>{it.observacao || "—"}</td></tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {s.observacao && <p className="text-xs text-muted-foreground mt-2"><strong>Obs:</strong> {s.observacao}</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function InsumoCombo({ insumos, value, onChange }: { insumos: any[]; value: ItemRow; onChange: (p: Partial<ItemRow>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="px-2">
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-80" align="start">
          <Command>
            <CommandInput placeholder="Buscar insumo por nome ou código..." />
            <CommandList>
              <CommandEmpty>Nenhum insumo encontrado.</CommandEmpty>
              <CommandGroup>
                {insumos.map(i => (
                  <CommandItem key={i.id} value={`${i.nome} ${i.codigo || ""}`} onSelect={() => {
                    onChange({ insumo_id: i.id, item: i.nome, unidade: i.unidade || "" });
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
      <Input placeholder="Item *" value={value.item} onChange={e => onChange({ item: e.target.value, insumo_id: null })} required />
    </div>
  );
}
