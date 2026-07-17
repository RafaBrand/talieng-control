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
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export default function Categorias() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [fTipo, setFTipo] = useState("all");

  const load = async () => { const { data } = await supabase.from("categorias").select("*").order("nome"); setItems(data || []); };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("categorias").insert({ nome: String(fd.get("nome")), tipo: String(fd.get("tipo")) });
    if (error) toast.error(error.message); else { toast.success("Salvo"); setOpen(false); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter(c => (fTipo === "all" || c.tipo === fTipo) && (!term || (c.nome || "").toLowerCase().includes(term)));
  }, [items, q, fTipo]);

  return (
    <div>
      <PageHeader title="Categorias" description="Categorias de produtos e serviços" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div><Label>Nome *</Label><Input name="nome" required /></div>
              <div>
                <Label>Tipo</Label>
                <Select name="tipo" defaultValue="produto">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="produto">Produto</SelectItem><SelectItem value="serviço">Serviço</SelectItem></SelectContent>
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
            <Input placeholder="Buscar por nome..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={fTipo} onValueChange={setFTipo}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="produto">Produto</SelectItem>
              <SelectItem value="serviço">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma categoria</TableCell></TableRow>}
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="capitalize">{c.tipo}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
