import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, fmtDate } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

export default function Fluxo() {
  const hoje = new Date();
  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10);

  const [periodo, setPeriodo] = useState({ de: ini, ate: fim });
  const [data, setData] = useState({ entradas: [] as any[], saidas: [] as any[] });

  useEffect(() => {
    (async () => {
      const [r, p] = await Promise.all([
        supabase.from("contas_receber").select("*, obras(nome)").eq("status", "recebido").gte("data_recebimento", periodo.de).lte("data_recebimento", periodo.ate),
        supabase.from("contas_pagar").select("*, fornecedores(nome)").eq("status", "pago").gte("data_pagamento", periodo.de).lte("data_pagamento", periodo.ate),
      ]);
      setData({ entradas: r.data || [], saidas: p.data || [] });
    })();
  }, [periodo]);

  const totIn = data.entradas.reduce((s, x) => s + Number(x.valor), 0);
  const totOut = data.saidas.reduce((s, x) => s + Number(x.valor), 0);
  const saldo = totIn - totOut;

  return (
    <div>
      <PageHeader title="Fluxo de Caixa" description="Entradas e saídas confirmadas no período" />
      <Card className="p-4 mb-6 shadow-card flex flex-wrap gap-4 items-end">
        <div><Label>De</Label><Input type="date" value={periodo.de} onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })} /></div>
        <div><Label>Até</Label><Input type="date" value={periodo.ate} onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })} /></div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Entradas</span><TrendingUp className="h-5 w-5 text-success" /></div>
          <p className="text-2xl font-bold text-success">{brl(totIn)}</p>
        </Card>
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Saídas</span><TrendingDown className="h-5 w-5 text-destructive" /></div>
          <p className="text-2xl font-bold text-destructive">{brl(totOut)}</p>
        </Card>
        <Card className="p-5 shadow-card bg-gradient-primary text-primary-foreground">
          <div className="flex items-center justify-between mb-2"><span className="text-sm opacity-90">Saldo</span><Wallet className="h-5 w-5" /></div>
          <p className="text-2xl font-bold">{brl(saldo)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <div className="p-4 border-b font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" />Entradas</div>
          <Table>
            <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.entradas.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sem entradas</TableCell></TableRow>}
              {data.entradas.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.descricao}<div className="text-xs text-muted-foreground">{e.obras?.nome || e.cliente}</div></TableCell>
                  <TableCell>{fmtDate(e.data_recebimento)}</TableCell>
                  <TableCell className="text-right font-medium text-success">+ {brl(e.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="shadow-card">
          <div className="p-4 border-b font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" />Saídas</div>
          <Table>
            <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.saidas.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sem saídas</TableCell></TableRow>}
              {data.saidas.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{s.descricao}<div className="text-xs text-muted-foreground">{s.fornecedores?.nome}</div></TableCell>
                  <TableCell>{fmtDate(s.data_pagamento)}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">− {brl(s.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
