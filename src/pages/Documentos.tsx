import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export default function Documentos() {
  const [obras, setObras] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [obraSel, setObraSel] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data: o } = await supabase.from("obras").select("id,nome").order("nome");
    setObras(o || []);
    const query = supabase.from("documentos").select("*, obras(nome)").order("created_at", { ascending: false });
    const { data } = obraSel ? await query.eq("obra_id", obraSel) : await query;
    setDocs(data || []);
  };
  useEffect(() => { load(); }, [obraSel]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!obraSel) { toast.error("Selecione uma obra"); return; }
    setUploading(true);
    const path = `${obraSel}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("documentos").insert({
      obra_id: obraSel, nome: file.name, tipo: file.type, storage_path: path, tamanho: file.size, uploaded_by: u.user?.id,
    });
    toast.success("Enviado"); setUploading(false); e.target.value = ""; load();
  };

  const baixar = async (path: string, nome: string) => {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    const a = document.createElement("a"); a.href = data.signedUrl; a.download = nome; a.click();
  };

  const remove = async (id: string, path: string) => {
    if (!confirm("Excluir documento?")) return;
    await supabase.storage.from("documentos").remove([path]);
    await supabase.from("documentos").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader title="Documentos" description="Arquivos organizados por obra" />
      <Card className="p-4 mb-6 shadow-card flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label>Obra</Label>
          <Select value={obraSel} onValueChange={setObraSel}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label>Buscar</Label>
          <Input placeholder="Nome do arquivo..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div>
          <Label className="block mb-1">Upload</Label>
          <Button asChild disabled={!obraSel || uploading}>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />{uploading ? "Enviando..." : "Enviar arquivo"}
              <input type="file" className="hidden" onChange={onUpload} />
            </label>
          </Button>
        </div>
      </Card>

      {(() => {
        const term = q.toLowerCase().trim();
        const filtered = term ? docs.filter(d => (d.nome || "").toLowerCase().includes(term)) : docs;
        return filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground shadow-card">Nenhum documento</Card>
        ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(d => (
            <Card key={d.id} className="p-4 shadow-card hover:shadow-elegant transition-shadow">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate" title={d.nome}>{d.nome}</p>
                  <p className="text-xs text-muted-foreground">{d.obras?.nome} · {fmtDate(d.created_at?.slice(0,10))}</p>
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" onClick={() => baixar(d.storage_path, d.nome)}><Download className="h-3 w-3 mr-1" />Baixar</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(d.id, d.storage_path)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        );
      })()}
    </div>
  );
}
