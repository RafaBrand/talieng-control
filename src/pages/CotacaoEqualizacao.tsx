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

type Preco = { cotacao_item_id: string; cotacao_fornecedor_id: string; preco_unitario: number; valor_com_desconto: number | null };

export default function CotacaoEqualizacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cot, setCot] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [forns, setForns] = useState<any[]>([]);
  const [precos, setPrecos] = useState<Record<string, Preco>>({}); // key = itemId::fornId
  const [freteForn, setFreteForn] = useState<Record<string, number>>({}); // fornId → frete total do fornecedor
  const [decisao, setDecisao] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [anexosByForn, setAnexosByForn] = useState<Record<string, any>>({});

  const key = (it: string, f: string) => `${it}::${f}`;

  useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

  const load = async () => {
    const [{ data: c }, { data: its }, { data: fs }] = await Promise.all([
      supabase.from("cotacoes").select("*, obras(nome)").eq("id", id!).maybeSingle(),
      supabase.from("cotacao_itens").select("*").eq("cotacao_id", id!).order("ordem"),
      supabase.from("cotacao_fornecedores").select("*, fornecedores(nome)").eq("cotacao_id", id!).order("ordem"),
    ]);
    setCot(c); setItens(its || []); setForns(fs || []);
    const fmap: Record<string, number> = {};
    (fs || []).forEach((f: any) => { fmap[f.id] = Number(f.frete_total || 0); });
    setFreteForn(fmap);

    const fornIds = (fs || []).map((f: any) => f.id);
    if (fornIds.length) {
      const { data: ps } = await supabase.from("cotacao_precos").select("*").in("cotacao_fornecedor_id", fornIds);
      const map: Record<string, Preco> = {};
      (ps || []).forEach((p: any) => {
        map[key(p.cotacao_item_id, p.cotacao_fornecedor_id)] = {
          cotacao_item_id: p.cotacao_item_id,
          cotacao_fornecedor_id: p.cotacao_fornecedor_id,
          preco_unitario: Number(p.preco_unitario) || 0,
          valor_com_desconto: p.valor_com_desconto == null ? null : Number(p.valor_com_desconto),
        };
      });
      setPrecos(map);
    }
    const itemIds = (its || []).map((i: any) => i.id);
    if (itemIds.length) {
      const { data: ds } = await supabase.from("cotacao_decisao").select("*").in("cotacao_item_id", itemIds);
      const dmap: Record<string, string> = {};
      (ds || []).forEach((d: any) => { dmap[d.cotacao_item_id] = d.cotacao_fornecedor_id; });
      setDecisao(dmap);
    }
    // anexos por fornecedor (via cotacao_envios.anexo_path)
    const { data: envios } = await supabase.from("cotacao_envios").select("*").eq("cotacao_id", id!).not("anexo_path", "is", null);
    const am: Record<string, any> = {};
    (envios || []).forEach((e: any) => { if (e.fornecedor_id) am[e.fornecedor_id] = e; });
    setAnexosByForn(am);
  };

  const setPreco = (itId: string, fId: string, field: "preco_unitario" | "valor_com_desconto", val: number | null) => {
    const k = key(itId, fId);
    const cur = precos[k] || { cotacao_item_id: itId, cotacao_fornecedor_id: fId, preco_unitario: 0, valor_com_desconto: null };
    setPrecos({ ...precos, [k]: { ...cur, [field]: val } });
  };

  // Handler: change unit → keeps unit. Change total → derives unit from quantidade.
  const onUnit = (itId: string, fId: string, unit: string) => {
    const v = unit === "" ? 0 : Number(unit);
    setPreco(itId, fId, "preco_unitario", v);
  };
  const onTotal = (itId: string, fId: string, qtd: number, total: string) => {
    const t = total === "" ? 0 : Number(total);
    const unit = qtd > 0 ? t / qtd : 0;
    setPreco(itId, fId, "preco_unitario", unit);
  };
  const onUnitDesc = (itId: string, fId: string, unit: string) => {
    const v = unit === "" ? null : Number(unit);
    setPreco(itId, fId, "valor_com_desconto", v);
  };
  const onTotalDesc = (itId: string, fId: string, qtd: number, total: string) => {
    if (total === "") { setPreco(itId, fId, "valor_com_desconto", null); return; }
    const t = Number(total);
    const unit = qtd > 0 ? t / qtd : 0;
    setPreco(itId, fId, "valor_com_desconto", unit);
  };

  // Unit efetivo (com desconto se houver)
  const unitEfetivo = (p?: Preco) => Number(p?.valor_com_desconto ?? p?.preco_unitario ?? 0);
  const totalItemForn = (it: any, fId: string) => unitEfetivo(precos[key(it.id, fId)]) * Number(it.quantidade || 0);

  const subTotalForn = (fId: string) => itens.reduce((s, it) => s + totalItemForn(it, fId), 0);
  const totalGeralForn = (fId: string) => subTotalForn(fId) + Number(freteForn[fId] || 0);

  // Cotação Ótima: menor total por item (só comparação)
  const otima = useMemo(() => {
    const map: Record<string, number> = {};
    itens.forEach(it => {
      const vals = forns.map(f => totalItemForn(it, f.id)).filter(v => v > 0);
      if (vals.length) map[it.id] = Math.min(...vals);
    });
    return map;
  }, [itens, forns, precos]);

  const melhorGlobal = useMemo(() => {
    let best: { fId: string; total: number } | null = null;
    forns.forEach(f => {
      const t = totalGeralForn(f.id);
      if (t <= 0) return;
      if (!best || t < (best as { fId: string; total: number }).total) best = { fId: f.id, total: t };
    });
    return best as { fId: string; total: number } | null;
  }, [forns, precos, freteForn]);

  const salvar = async () => {
    setSaving(true);
    try {
      const rows = Object.values(precos).map(p => ({
        cotacao_item_id: p.cotacao_item_id,
        cotacao_fornecedor_id: p.cotacao_fornecedor_id,
        preco_unitario: Number(p.preco_unitario) || 0,
        valor_com_desconto: p.valor_com_desconto == null ? null : Number(p.valor_com_desconto),
        frete: 0, // frete legado por item — não usado mais
      }));
      if (rows.length) {
        const { error } = await supabase.from("cotacao_precos").upsert(rows as any, { onConflict: "cotacao_fornecedor_id,cotacao_item_id" });
        if (error) throw error;
      }
      // Frete por fornecedor
      for (const f of forns) {
        const { error } = await supabase.from("cotacao_fornecedores")
          .update({ frete_total: Number(freteForn[f.id] || 0) } as any)
          .eq("id", f.id);
        if (error) throw error;
      }
      toast.success("Equalização salva");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const selecionar = async (itId: string, fId: string) => {
    setDecisao({ ...decisao, [itId]: fId });
    await supabase.from("cotacao_decisao").upsert({ cotacao_item_id: itId, cotacao_fornecedor_id: fId });
    toast.success("Vencedor definido");
  };

  const uploadAnexo = async (envioId: string | null, fornCotId: string, file: File) => {
    const path = `cotacoes/${id}/${fornCotId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documentos").upload(path, file, { upsert: false });
    if (upErr) { toast.error(upErr.message); return; }
    const forn = forns.find(f => f.id === fornCotId);
    if (envioId) {
      await supabase.from("cotacao_envios").update({ anexo_path: path } as any).eq("id", envioId);
    } else {
      await supabase.from("cotacao_envios").insert({
        cotacao_id: id, fornecedor_id: forn?.fornecedor_id || null,
        fornecedor_nome: forn?.fornecedores?.nome || forn?.nome_avulso || null,
        canal: "email", status: "enviado", anexo_path: path,
      });
    }
    toast.success("Anexo enviado");
    await load();
  };

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
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 sticky left-0 bg-muted min-w-48">Item</th>
              <th className="text-left p-2">Qtd</th>
              {forns.map(f => {
                const anexo = anexosByForn[f.fornecedor_id];
                const isBest = melhorGlobal?.fId === f.id;
                return (
                  <th key={f.id} className={`text-left p-2 min-w-64 border-l align-top ${isBest ? "bg-green-50 dark:bg-green-950" : ""}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{fNome(f)}</span>
                        {isBest && <Badge className="bg-success text-success-foreground text-[10px]"><Trophy className="h-3 w-3 mr-1" />Melhor</Badge>}
                      </div>
                      <div className="text-[11px] font-normal text-muted-foreground">
                        Prazo: {f.prazo_entrega || "—"} · {f.condicao_pagamento || "—"}
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                        <label className="inline-flex items-center gap-1 text-[11px] cursor-pointer text-primary hover:underline">
                          <Upload className="h-3 w-3" />
                          {anexo ? "Trocar" : "Anexar"}
                          <input type="file" className="hidden" onChange={e => {
                            const file = e.target.files?.[0]; if (file) uploadAnexo(anexo?.id || null, f.id, file);
                          }} />
                        </label>
                        {anexo?.anexo_path && (
                          <a className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:underline" href="#"
                            onClick={async (ev) => {
                              ev.preventDefault();
                              const { data } = await supabase.storage.from("documentos").createSignedUrl(anexo.anexo_path, 60);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                            }}>
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
              const qtd = Number(it.quantidade || 0);
              return (
                <tr key={it.id} className="border-t align-top">
                  <td className="p-3 sticky left-0 bg-background font-medium">{it.item}</td>
                  <td className="p-2 whitespace-nowrap">{qtd} {it.unidade}</td>
                  {forns.map(f => {
                    const p = precos[key(it.id, f.id)];
                    const unit = Number(p?.preco_unitario || 0);
                    const total = unit * qtd;
                    const unitDesc = p?.valor_com_desconto;
                    const totalDesc = unitDesc == null ? "" : (Number(unitDesc) * qtd).toFixed(2);
                    const totalEfetivo = unitEfetivo(p) * qtd;
                    const isMin = totalEfetivo > 0 && totalEfetivo === otim;
                    return (
                      <td key={f.id} className={`p-2 border-l ${isMin ? "bg-green-50 dark:bg-green-950" : ""}`}>
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="text-[10px] text-muted-foreground">Unitário</label>
                            <Input className="h-7 text-xs" type="number" step="0.01" value={unit || ""} onChange={e => onUnit(it.id, f.id, e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Total</label>
                            <Input className="h-7 text-xs" type="number" step="0.01" value={total ? total.toFixed(2) : ""} onChange={e => onTotal(it.id, f.id, qtd, e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Unit. c/ desc.</label>
                            <Input className="h-7 text-xs" type="number" step="0.01" value={unitDesc ?? ""} onChange={e => onUnitDesc(it.id, f.id, e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Total c/ desc.</label>
                            <Input className="h-7 text-xs" type="number" step="0.01" value={totalDesc} onChange={e => onTotalDesc(it.id, f.id, qtd, e.target.value)} />
                          </div>
                        </div>
                        <div className="text-[11px] font-semibold pt-1 mt-1 border-t">
                          Efetivo: {totalEfetivo > 0 ? brl(totalEfetivo) : "—"}
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
                    <select className="h-8 w-40 text-xs border rounded-md px-2 bg-background"
                      value={decisao[it.id] || ""} onChange={e => selecionar(it.id, e.target.value)}>
                      <option value="">Selecionar vencedor</option>
                      {forns.map(f => <option key={f.id} value={f.id}>{fNome(f)}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}

            {/* Linha de subtotal */}
            <tr className="border-t bg-muted/40 font-medium">
              <td className="p-2 sticky left-0 bg-muted/40" colSpan={2}>Subtotal</td>
              {forns.map(f => (
                <td key={f.id} className="p-2 border-l">{brl(subTotalForn(f.id))}</td>
              ))}
              <td className="border-l"></td><td className="border-l"></td>
            </tr>

            {/* Frete por fornecedor */}
            <tr className="border-t bg-muted/20">
              <td className="p-2 sticky left-0 bg-muted/20 font-medium" colSpan={2}>Frete (total do fornecedor)</td>
              {forns.map(f => (
                <td key={f.id} className="p-2 border-l">
                  <Input className="h-8 text-xs" type="number" step="0.01" placeholder="0,00"
                    value={freteForn[f.id] ?? ""} onChange={e => setFreteForn({ ...freteForn, [f.id]: e.target.value === "" ? 0 : Number(e.target.value) })} />
                </td>
              ))}
              <td className="border-l"></td><td className="border-l"></td>
            </tr>

            {/* Total geral */}
            <tr className="border-t bg-muted font-bold">
              <td className="p-2 sticky left-0 bg-muted" colSpan={2}>TOTAL GERAL</td>
              {forns.map(f => {
                const t = totalGeralForn(f.id);
                const isBest = melhorGlobal?.fId === f.id;
                return (
                  <td key={f.id} className={`p-2 border-l ${isBest ? "text-success" : ""}`}>
                    {t > 0 ? brl(t) : "—"}
                  </td>
                );
              })}
              <td className="border-l"></td><td className="border-l"></td>
            </tr>
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground mt-3">
        Preencha <strong>Unitário</strong> ou <strong>Total</strong> — o outro campo é calculado automaticamente pela quantidade.
        O mesmo vale para os valores <em>com desconto</em>. O <strong>Frete</strong> é lançado uma vez por fornecedor.
        A coluna <strong>Cotação Ótima</strong> mostra o menor total por item (usando o valor com desconto quando informado) — apenas para comparação.
      </p>
    </div>
  );
}
