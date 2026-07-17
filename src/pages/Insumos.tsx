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
import { PageHeader } from "@/components/PageHeader";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const UNIDADES = ["un", "m²", "m", "m³", "kg", "l", "cx", "rl", "vb", "vg", "pc", "sc"];

export default function Insumos() {
  const [items, setItems] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("all");

  const load = async () => {
    const [{ data }, { data: c }] = await Promise.all([
      supabase.from("insumos").select("*, categorias(nome)").order("nome"),
      supabase.from("categorias").select("id,nome").order("nome"),
    ]);
    setItems(data || []); setCategorias(c || []);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      nome: String(fd.get("nome")),
      codigo: String(fd.get("codigo") || "") || null,
      categoria_id: String(fd.get("categoria_id") || "") || null,
      unidade: String(fd.get("unidade") || "") || null,
      descricao: String(fd.get("descricao") || "") || null,
    };
    const { error } = editing
      ? await supabase.from("insumos").update(payload).eq("id", editing.id)
      : await supabase.from("insumos").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Salvo"); setOpen(false); setEditing(null); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir insumo?")) return;
    const { error } = await supabase.from("insumos").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter(i => {
      if (fCat !== "all" && i.categoria_id !== fCat) return false;
      if (!term) return true;
      return [i.nome, i.codigo, i.descricao].some(x => (x || "").toLowerCase().includes(term));
    });
  }, [items, q, fCat]);

  return (
    <div>
      <PageHeader title="Insumos" description="Cadastro de materiais e serviços padrão" action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Novo insumo</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} insumo</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2"><Label>Nome *</Label><Input name="nome" required defaultValue={editing?.nome || ""} /></div>
                <div><Label>Código</Label><Input name="codigo" defaultValue={editing?.codigo || ""} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select name="categoria_id" defaultValue={editing?.categoria_id || ""}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select name="unidade" defaultValue={editing?.unidade || ""}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descrição / especificação</Label><Textarea name="descricao" rows={3} defaultValue={editing?.descricao || ""} /></div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <Card className="p-3 mb-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
            <Input placeholder="Buscar por nome, código ou descrição..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fCat} onValueChange={setFCat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas categorias</SelectItem>{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Unidade</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum insumo</TableCell></TableRow>}
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.codigo || "—"}</TableCell>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell>{i.categorias?.nome || "—"}</TableCell>
                <TableCell>{i.unidade || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(i); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button>
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
