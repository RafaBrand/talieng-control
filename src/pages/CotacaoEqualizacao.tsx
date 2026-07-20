import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, Paperclip, Trophy, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

type Preco = { id?: string; cotacao_item_id: string; cotacao_fornecedor_id: string; preco_unitario: number; valor_com_desconto: number | null; frete: number };

export default function CotacaoEqualizacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cot, setCot] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [forns, setForns] = useState<any[]>([]);
  const [precos, setPrecos] = useState<Record<string, Preco>>({}); // key = itemId::fornId
  const [decisao, setDecisao] = useState<Record<string, string>>({}); // itemId → fornId
  const [saving, setSaving] = useState(false);

  const key = (it: string, f: string) => `${it}::${f}`;

  useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

  const load = async () => {
    const [{ data: c }, { data: its }, { data: fs }] = await Promise.all([
      supabase.from("cotacoes").select("*, obras(nome)").eq("id", id!).maybeSingle(),
      supabase.from("cotacao_itens").select("*").eq("cotacao_id", id!).order("ordem"),
      supabase.from("cotacao_fornecedores").select("*, fornecedores(nome)").eq("cotacao_id", id!).order("ordem"),
    ]);
    setCot(c); setItens(its || []); setForns(fs || []);
    const fornIds = (fs || []).map((f: any) => f.id);
    if (fornIds.length) {
      const { data: ps } = await supabase.from("cotacao_precos").select("*").in("cotacao_fornecedor_id", fornIds);
      const map: Record<string, Preco> = {};
      (ps || []).forEach((p: any) => { map[key(p.cotacao_item_id, p.cotacao_fornecedor_id)] = p; });
      setPrecos(map);
    }
    const itemIds = (its || []).map((i: any) => i.id);
    if (itemIds.length) {
      const { data: ds } = await supabase.from("cotacao_decisao").select("*").in("cotacao_item_id", itemIds);
      const dmap: Record<string, string> = {};
      (ds || []).forEach((d: any) => { dmap[d.cotacao_item_id] = d.cotacao_fornecedor_id; });
      setDecisao(dmap);
    }
  };

  const setField = (itId: string, fId: string, field: "preco_unitario" | "valor_com_desconto" | "frete", val: string) => {
    const k = key(itId, fId);
    const cur = precos[k] || { cotacao_item_id: itId, cotacao_fornecedor_id: fId, preco_unitario: 0, valor_com_desconto: null, frete: 0 };
    const num = val === "" ? (field === "valor_com_desconto" ? null : 0) : Number(val);
    setPrecos({ ...precos, [k]: { ...cur, [field]: num } as Preco });
  };

  const efetivo = (p?: Preco) => {
    if (!p) return 0;
    return Number(p.valor_com_desconto ?? p.preco_unitario ?? 0) + Number(p.frete || 0);
  };

  const otima = useMemo(() => {
    const map: Record<string, number> = {};
    itens.forEach(it => {
      const vals = forns.map(f => efetivo(precos[key(it.id, f.id)])).filter(v => v > 0);
      if (vals.length) map[it.id] = Math.min(...vals);
    });
    return map;
  }, [itens, forns, precos]);

  const salvar = async () => {
    setSaving(true);
    try {
      const rows = Object.values(precos).map(p => ({
        cotacao_item_id: p.cotacao_item_id,
        cotacao_fornecedor_id: p.cotacao_fornecedor_id,
        preco_unitario: Number(p.preco_unitario) || 0,
        valor_com_desconto: p.valor_com_desconto == null ? null : Number(p.valor_com_desconto),
        frete: Number(p.frete) || 0,
      }));
      if (rows.length) {
        const { error } = await supabase.from("cotacao_precos").upsert(rows as any, { onConflict: "cotacao_fornecedor_id,cotacao_item_id" });
        if (error) throw error;
      }
      toast.success("Equalização salva");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const selecionar = async (itId: string, fId: string) => {
    if (fId === "__otima") return;
    setDecisao({ ...decisao, [itId]: fId });
    await supabase.from("cotacao_decisao").upsert({ cotacao_item_id: itId, cotacao_fornecedor_id: fId });
    toast.success("Vencedor definido");
  };

  const uploadAnexo = async (envioLikeId: string | null, fornCotId: string, file: File) => {
    // grava em bucket 'documentos'
    const path = `cotacoes/${id}/${fornCotId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documentos").upload(path, file, { upsert: false });
    if (upErr) { toast.error(upErr.message); return; }
    // registra ou atualiza envio com anexo_path
    const forn = forns.find(f => f.id === fornCotId);
    const payload: any = {
      cotacao_id: id, fornecedor_id: forn?.fornecedor_id || null,
      fornecedor_nome: forn?.fornecedores?.nome || forn?.nome_avulso || null,
      canal: "email", status: "enviado", anexo_path: path,
    };
    if (envioLikeId) {
      await supabase.from("cotacao_envios").update({ anexo_path: path } as any).eq("id", envioLikeId);
    } else {
      await supabase.from("cotacao_envios").insert(payload);
    }
    toast.success("Anexo enviado");
    await load();
  };

  const [anexosByForn, setAnexosByForn] = useState<Record<string, any>>({});
  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase.from("cotacao_envios").select("*").eq("cotacao_id", id).not("anexo_path", "is", null);
      const m: Record<string, any> = {};
      (data || []).forEach((e: any) => { if (e.fornecedor_id) m[e.fornecedor_id] = e; });
      setAnexosByForn(m);
    })();
  }, [id, forns.length]);

  const fNome = (f: any) => f.fornecedores?.nome || f.nome_avulso || "—";

  if (!cot) return <div className="p-6">Carregando...</div>;

  return (
    <div>
      <PageHeader title={`Equalização COT ${String(cot.numero).padStart(2, "0")}`} description={cot.obras?.nome || "—"} action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/cotacoes")}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
          <Button onClick={salvar} disabled={saving}><Save className="h-4 w-4 mr-2" />Salvar equalização</Button>
        </div>
      } />

      <Card className="p-0 shadow-card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 sticky left-0 bg-muted">Item</th>
              <th className="text-left p-2">Qtd</th>
              {forns.map(f => {
                const anexo = f.fornecedor_id ? anexosByForn[f.fornecedor_id] : null;
                return (
                  <th key={f.id} className="text-left p-2 min-w-56 border-l align-top">
                    <div className="space-y-1">
                      <div className="font-semibold">{fNome(f)}</div>
                      <div className="text-xs font-normal text-muted-foreground">Prazo: {f.prazo_entrega || "—"} · {f.condicao_pagamento || "—"}</div>
                      <div>
                        <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-primary hover:underline">
                          <Upload className="h-3 w-3" />
                          {anexo ? "Trocar anexo" : "Anexar arquivo"}
                          <input type="file" className="hidden" onChange={e => {
                            const file = e.target.files?.[0]; if (file) uploadAnexo(anexo?.id || null, f.id, file);
                          }} />
                        </label>
                        {anexo?.anexo_path && (
                          <a
                            className="ml-2 text-xs inline-flex items-center gap-1 text-muted-foreground hover:underline"
                            href="#"
                            onClick={async (ev) => {
                              ev.preventDefault();
                              const { data } = await supabase.storage.from("documentos").createSignedUrl(anexo.anexo_path, 60);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                            }}
                          >
                            <Paperclip className="h-3 w-3" />ver
                          </a>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="text-left p-2 min-w-32 border-l bg-green-50 dark:bg-green-950">
                <Trophy className="h-4 w-4 inline mr-1 text-success" />Cotação Ótima
              </th>
              <th className="text-left p-2 border-l">Decisão</th>
            </tr>
          </thead>
          <tbody>
            {itens.map(it => {
              const otim = otima[it.id] || 0;
              return (
                <tr key={it.id} className="border-t align-top">
                  <td className="p-3 sticky left-0 bg-background font-medium">{it.item}</td>
                  <td className="p-2">{it.quantidade} {it.unidade}</td>
                  {forns.map(f => {
                    const p = precos[key(it.id, f.id)];
                    const ef = efetivo(p);
                    const isMin = ef > 0 && ef === otim;
                    return (
                      <td key={f.id} className={`p-2 border-l ${isMin ? "bg-green-50 dark:bg-green-950" : ""}`}>
                        <div className="space-y-1">
                          <Input className="h-7 text-xs" type="number" step="0.01" placeholder="Unitário" value={p?.preco_unitario ?? ""} onChange={e => setField(it.id, f.id, "preco_unitario", e.target.value)} />
                          <Input className="h-7 text-xs" type="number" step="0.01" placeholder="Após desconto" value={p?.valor_com_desconto ?? ""} onChange={e => setField(it.id, f.id, "valor_com_desconto", e.target.value)} />
                          <Input className="h-7 text-xs" type="number" step="0.01" placeholder="Frete" value={p?.frete ?? ""} onChange={e => setField(it.id, f.id, "frete", e.target.value)} />
                          <div className="text-xs font-semibold pt-1 border-t">{ef > 0 ? brl(ef) : "—"}</div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2 border-l bg-green-50/40 dark:bg-green-950/40">
                    {otim > 0 ? (
                      <div>
                        <Badge className="bg-success text-success-foreground">{brl(otim)}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">apenas comparação</p>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="p-2 border-l">
                    <select
                      className="h-8 w-40 text-xs border rounded-md px-2 bg-background"
                      value={decisao[it.id] || ""}
                      onChange={e => selecionar(it.id, e.target.value)}
                    >
                      <option value="">Selecionar vencedor</option>
                      {forns.map(f => <option key={f.id} value={f.id}>{fNome(f)}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground mt-3">
        A coluna <strong>Cotação Ótima</strong> mostra o menor preço encontrado por item (valor após desconto quando informado, mais frete). É apenas referência de comparação — não pode ser selecionada como vencedora.
      </p>
    </div>
  );
}
