import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export default function Configuracoes() {
  const [cfg, setCfg] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const load = async () => {
    const { data } = await supabase.from("empresa_config").select("*").limit(1).maybeSingle();
    setCfg(data || {});
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {};
    ["nome","razao_social","cnpj","endereco","cidade","uf","cep","telefone","contato","email","banco","agencia","conta"].forEach(k => {
      payload[k] = String(fd.get(k) || "") || null;
    });

    if (logoFile) {
      const path = `logos/${Date.now()}-${logoFile.name}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, logoFile, { upsert: true });
      if (upErr) { toast.error(upErr.message); return; }
      const { data: signed } = await supabase.storage.from("documentos").createSignedUrl(path, 60 * 60 * 24 * 365);
      payload.logo_url = signed?.signedUrl || null;
    }

    const { error } = await supabase.from("empresa_config").update(payload).eq("id", cfg.id);
    if (error) toast.error(error.message); else { toast.success("Configurações salvas"); load(); }
  };

  if (!cfg) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div>
      <PageHeader title="Configurações da Empresa" description="Dados utilizados nas Ordens de Compra e PDFs" />
      <Card className="p-6 shadow-card max-w-3xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Nome fantasia</Label><Input name="nome" defaultValue={cfg.nome || ""} /></div>
            <div><Label>Razão social</Label><Input name="razao_social" defaultValue={cfg.razao_social || ""} /></div>
            <div><Label>CNPJ</Label><Input name="cnpj" defaultValue={cfg.cnpj || ""} /></div>
            <div><Label>Telefone</Label><Input name="telefone" defaultValue={cfg.telefone || ""} /></div>
            <div className="md:col-span-2"><Label>Endereço</Label><Input name="endereco" defaultValue={cfg.endereco || ""} /></div>
            <div><Label>Cidade</Label><Input name="cidade" defaultValue={cfg.cidade || ""} /></div>
            <div><Label>UF</Label><Input name="uf" defaultValue={cfg.uf || ""} /></div>
            <div><Label>CEP</Label><Input name="cep" defaultValue={cfg.cep || ""} /></div>
            <div><Label>Contato</Label><Input name="contato" defaultValue={cfg.contato || ""} /></div>
            <div className="md:col-span-2"><Label>E-mail</Label><Input name="email" type="email" defaultValue={cfg.email || ""} /></div>
            <div><Label>Banco</Label><Input name="banco" defaultValue={cfg.banco || ""} /></div>
            <div><Label>Agência</Label><Input name="agencia" defaultValue={cfg.agencia || ""} /></div>
            <div><Label>Conta nº</Label><Input name="conta" defaultValue={cfg.conta || ""} /></div>
            <div className="md:col-span-2">
              <Label>Logo (imagem)</Label>
              {cfg.logo_url && <img src={cfg.logo_url} alt="Logo" className="h-16 mb-2" />}
              <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <Button type="submit">Salvar</Button>
        </form>
      </Card>
    </div>
  );
}
