
-- Categorias
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'produto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view categorias" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write categorias" ON public.categorias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_cat_updated BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categorias (nome, tipo) VALUES
  ('Elétrica','produto'),('Hidráulica','produto'),('Drywall','produto'),('Pintura','produto'),
  ('Esquadrias','produto'),('Piso','produto'),('Serviços Complementares','produto'),('Outros','produto');

-- Fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo fornecedores" ON public.fornecedores FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'fornecedores')) WITH CHECK (public.tem_modulo(auth.uid(),'fornecedores'));
CREATE TRIGGER trg_forn_updated BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Obras
CREATE TABLE public.obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  cliente TEXT,
  status TEXT NOT NULL DEFAULT 'planejada',
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obras TO authenticated;
GRANT ALL ON public.obras TO service_role;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo obras" ON public.obras FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'obras')) WITH CHECK (public.tem_modulo(auth.uid(),'obras'));
CREATE TRIGGER trg_obras_updated BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insumos
CREATE TABLE public.insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  unidade text,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insumos TO authenticated;
GRANT ALL ON public.insumos TO service_role;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view insumos" ON public.insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "write insumos" ON public.insumos FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'insumos')) WITH CHECK (public.tem_modulo(auth.uid(),'insumos'));
CREATE TRIGGER trg_insumos_updated BEFORE UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Centros de custo
CREATE TYPE public.centro_custo_tipo AS ENUM ('obra', 'administrativo', 'personalizado');
CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo public.centro_custo_tipo NOT NULL DEFAULT 'personalizado',
  ativo boolean NOT NULL DEFAULT true,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "centros_custo authenticated all" ON public.centros_custo
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_centros_custo_updated_at BEFORE UPDATE ON public.centros_custo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.gen_cc_codigo_obra()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_n int; v_cod text;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '')::int), 0) + 1
    INTO v_n FROM public.centros_custo WHERE codigo ~ '^CC-OBR-\d+$';
  v_cod := 'CC-OBR-' || lpad(v_n::text, 4, '0');
  RETURN v_cod;
END $$;

CREATE OR REPLACE FUNCTION public.obra_cria_centro_custo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.centros_custo (codigo, nome, tipo, obra_id, ativo)
    VALUES (public.gen_cc_codigo_obra(), NEW.nome, 'obra', NEW.id, true);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_obra_cria_cc AFTER INSERT ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.obra_cria_centro_custo();

-- Solicitações de compra
CREATE SEQUENCE public.solicitacoes_numero_seq START 1;
CREATE TABLE public.solicitacoes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL DEFAULT nextval('public.solicitacoes_numero_seq') UNIQUE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  titulo TEXT,
  observacao TEXT,
  urgencia TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'aberta',
  solicitante_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_compra TO authenticated;
GRANT ALL ON public.solicitacoes_compra TO service_role;
ALTER TABLE public.solicitacoes_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo solic" ON public.solicitacoes_compra FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'solicitacoes')) WITH CHECK (public.tem_modulo(auth.uid(),'solicitacoes'));
CREATE TRIGGER trg_solic_updated BEFORE UPDATE ON public.solicitacoes_compra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.solicitacao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_compra(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES public.insumos(id) ON DELETE SET NULL,
  item TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  unidade TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacao_itens TO authenticated;
GRANT ALL ON public.solicitacao_itens TO service_role;
ALTER TABLE public.solicitacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo solic_itens" ON public.solicitacao_itens FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'solicitacoes')) WITH CHECK (public.tem_modulo(auth.uid(),'solicitacoes'));
CREATE INDEX idx_solic_itens_solic ON public.solicitacao_itens(solicitacao_id);
