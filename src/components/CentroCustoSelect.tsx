import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CC = { id: string; codigo: string; nome: string; tipo: string; ativo: boolean; obra_id: string | null };

let cache: CC[] | null = null;
const subs = new Set<(v: CC[]) => void>();

export async function reloadCentrosCusto() {
  const { data } = await supabase.from("centros_custo").select("id,codigo,nome,tipo,ativo,obra_id").order("codigo");
  cache = (data || []) as CC[];
  subs.forEach(fn => fn(cache!));
}

export function useCentrosCusto() {
  const [list, setList] = useState<CC[]>(cache || []);
  useEffect(() => {
    subs.add(setList);
    if (!cache) reloadCentrosCusto();
    return () => { subs.delete(setList); };
  }, []);
  return list;
}

export function CentroCustoSelect({
  value, onValueChange, required, placeholder = "Selecione centro de custo", obraId,
}: { value?: string | null; onValueChange: (v: string) => void; required?: boolean; placeholder?: string; obraId?: string | null }) {
  const list = useCentrosCusto();
  // Auto-select centro da obra se nada selecionado
  useEffect(() => {
    if (!value && obraId && list.length) {
      const cc = list.find(c => c.obra_id === obraId && c.ativo);
      if (cc) onValueChange(cc.id);
    }
    // eslint-disable-next-line
  }, [obraId, list.length]);

  const visible = list.filter(c => c.ativo || c.id === value);
  return (
    <Select value={value || undefined} onValueChange={onValueChange} required={required}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {visible.map(c => (
          <SelectItem key={c.id} value={c.id}>
            {c.codigo} — {c.nome}{!c.ativo ? " (inativo)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
