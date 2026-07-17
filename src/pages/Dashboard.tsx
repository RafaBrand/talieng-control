import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { brl, fmtDate } from "@/lib/format";
import { HardHat, AlertCircle, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const [stats, setStats] = useState({ obrasAtivas: 0, vencendo: [] as any[], entradas: 0, saidas: 0, ordens: 0 });

  useEffect(() => {
    (async () => {
      const hoje = new Date(); const em7 = new Date(); em7.setDate(hoje.getDate() + 7);
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10);

      const [obras, cp, cr, cpMes, crMes, ord] = await Promise.all([
        supabase.from("obras").select("id", { count: "exact", head: true }).eq("status", "em andamento"),
        supabase.from("contas_pagar").select("id, descricao, valor, vencimento, status").eq("status", "pendente").lte("vencimento", em7.toISOString().slice(0,10)).order("vencimento"),
        supabase.from("contas_receber").select("id, descricao, valor, vencimento, status").eq("status", "pendente").lte("vencimento", em7.toISOString().slice(0,10)).order("vencimento"),
        supabase.from("contas_pagar").select("valor").eq("status", "pago").gte("data_pagamento", inicioMes).lte("data_pagamento", fimMes),
        supabase.from("contas_receber").select("valor").eq("status", "recebido").gte("data_recebimento", inicioMes).lte("data_recebimento", fimMes),
        supabase.from("ordens_compra").select("id", { count: "exact", head: true }),
      ]);

      const venc = [
        ...(cp.data || []).map(x => ({ ...x, tipo: "Pagar" })),
        ...(cr.data || []).map(x => ({ ...x, tipo: "Receber" })),
      ].sort((a,b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 8);

      setStats({
        obrasAtivas: obras.count || 0,
        vencendo: venc,
        saidas: (cpMes.data || []).reduce((s, x) => s + Number(x.valor), 0),
        entradas: (crMes.data || []).reduce((s, x) => s + Number(x.valor), 0),
        ordens: ord.count || 0,
      });
    })();
  }, []);

  const saldo = stats.entradas - stats.saidas;

  const cards = [
    { label: "Obras ativas", value: stats.obrasAtivas, icon: HardHat, color: "text-primary" },
    { label: "Ordens de compra", value: stats.ordens, icon: AlertCircle, color: "text-accent-foreground" },
    { label: "Entradas (mês)", value: brl(stats.entradas), icon: TrendingUp, color: "text-success" },
    { label: "Saídas (mês)", value: brl(stats.saidas), icon: TrendingDown, color: "text-destructive" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral da operação" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 shadow-card hover:shadow-elegant transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 shadow-card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-warning" />
            <h3 className="font-semibold">Vencimentos nos próximos 7 dias</h3>
          </div>
          {stats.vencendo.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum vencimento próximo 🎉</p>
          ) : (
            <div className="space-y-2">
              {stats.vencendo.map((v) => (
                <div key={v.tipo + v.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 border">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{v.descricao}</p>
                    <p className="text-xs text-muted-foreground">{v.tipo} · {fmtDate(v.vencimento)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-semibold ${v.tipo === "Pagar" ? "text-destructive" : "text-success"}`}>
                      {v.tipo === "Pagar" ? "−" : "+"} {brl(v.valor)}
                    </span>
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 shadow-card bg-gradient-primary text-primary-foreground">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5" />
            <h3 className="font-semibold">Fluxo do mês</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="opacity-90">Entradas</span><span className="font-semibold">{brl(stats.entradas)}</span></div>
            <div className="flex justify-between text-sm"><span className="opacity-90">Saídas</span><span className="font-semibold">{brl(stats.saidas)}</span></div>
            <div className="border-t border-primary-foreground/20 pt-3 flex justify-between">
              <span className="font-medium">Saldo</span>
              <span className="text-xl font-bold">{brl(saldo)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
