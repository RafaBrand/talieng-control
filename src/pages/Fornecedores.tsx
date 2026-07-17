import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type Forn = { id: string; nome: string; cnpj: string | null; contato: string | null; email: string | null; telefone: string | null; categoria_id: string | null };

export default function Fornecedores() {
  const [items, setItems] = useState<Forn[]>([]);
  const [cats, setCats] = useState<{ id: string; nome: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Forn | null>(null);
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("all");

  const load = async () => {
    const [{ data }, { data: c }] = await Promise.all([
      supabase.from("fornecedores").select("*").order("nome"),
      supabase.from("categorias").select("id,nome").order("nome"),
    ]);
    setItems(data || []); setCats(c || []);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      nome: String(fd.get("nome")),
      cnpj: String(fd.get("cnpj") || "") || null,
      contato: String(fd.get("contato") || "") || null,
      email: String(fd.get("email") || "") || null,
      telefone: String(fd.get("telefone") || "") || null,
      categoria_id: String(fd.get("categoria_id") || "") || null,
    };
    const { error } = editing
      ? await supabase.from("fornecedores").update(payload).eq("id", editing.id)
      : await supabase.from("fornecedores").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Salvo"); setOpen(false); setEditing(null); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir fornecedor?")) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter(f => {
      if (fCat !== "all" && f.categoria_id !== fCat) return false;
      if (!term) return true;
      return [f.nome, f.cnpj, f.contato, f.email, f.telefone].some(x => (x || "").toLowerCase().includes(term));
    });
  }, [items, q, fCat]);

  return (
    <div>
      <PageHeader title="Fornecedores" description="Cadastro de fornecedores e parceiros" action={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} fornecedor</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div><Label>Nome *</Label><Input name="nome" required defaultValue={editing?.nome} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CNPJ</Label><Input name="cnpj" defaultValue={editing?.cnpj || ""} /></div>
                <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone || ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contato</Label><Input name="contato" defaultValue={editing?.contato || ""} /></div>
                <div><Label>Email</Label><Input name="email" type="email" defaultValue={editing?.email || ""} /></div>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select name="categoria_id" defaultValue={editing?.categoria_id || undefined}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <Card className="p-3 mb-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CNPJ, contato..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fCat} onValueChange={setFCat}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas categorias</SelectItem>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead>Contato</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum fornecedor</TableCell></TableRow>}
            {filtered.map(f => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell>{f.cnpj || "—"}</TableCell>
                <TableCell>{f.contato || "—"}</TableCell>
                <TableCell>{f.email || "—"}</TableCell>
                <TableCell>{f.telefone || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
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
