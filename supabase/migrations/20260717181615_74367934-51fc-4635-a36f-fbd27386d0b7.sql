
-- Cotações
CREATE SEQUENCE public.cotacoes_numero_seq;
CREATE TABLE public.cotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL DEFAULT nextval('public.cotacoes_numero_seq'),
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  endereco_entrega text,
  usa_endereco_obra boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'aberta',
  observacao text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacoes TO authenticated;
GRANT ALL ON public.cotacoes TO service_role;
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo cotacoes" ON public.cotacoes FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'cotacoes')) WITH CHECK (public.tem_modulo(auth.uid(),'cotacoes'));

CREATE TABLE public.cotacao_solicitacoes (
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes_compra(id) ON DELETE CASCADE,
  PRIMARY KEY (cotacao_id, solicitacao_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_solicitacoes TO authenticated;
GRANT ALL ON public.cotacao_solicitacoes TO service_role;
ALTER TABLE public.cotacao_solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo cot_sol" ON public.cotacao_solicitacoes FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'cotacoes')) WITH CHECK (public.tem_modulo(auth.uid(),'cotacoes'));

CREATE TABLE public.cotacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  solicitacao_item_id uuid REFERENCES public.solicitacao_itens(id) ON DELETE SET NULL,
  item text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text,
  ordem int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_itens TO authenticated;
GRANT ALL ON public.cotacao_itens TO service_role;
ALTER TABLE public.cotacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo cot_itens" ON public.cotacao_itens FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'cotacoes')) WITH CHECK (public.tem_modulo(auth.uid(),'cotacoes'));

CREATE TABLE public.cotacao_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  nome_avulso text,
  prazo_entrega text,
  condicao_pagamento text,
  ordem int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_fornecedores TO authenticated;
GRANT ALL ON public.cotacao_fornecedores TO service_role;
ALTER TABLE public.cotacao_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo cot_forn" ON public.cotacao_fornecedores FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'cotacoes')) WITH CHECK (public.tem_modulo(auth.uid(),'cotacoes'));

CREATE TABLE public.cotacao_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_fornecedor_id uuid NOT NULL REFERENCES public.cotacao_fornecedores(id) ON DELETE CASCADE,
  cotacao_item_id uuid NOT NULL REFERENCES public.cotacao_itens(id) ON DELETE CASCADE,
  preco_unitario numeric NOT NULL DEFAULT 0,
  UNIQUE(cotacao_fornecedor_id, cotacao_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_precos TO authenticated;
GRANT ALL ON public.cotacao_precos TO service_role;
ALTER TABLE public.cotacao_precos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo cot_pre" ON public.cotacao_precos FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'cotacoes')) WITH CHECK (public.tem_modulo(auth.uid(),'cotacoes'));

CREATE TABLE public.cotacao_decisao (
  cotacao_item_id uuid PRIMARY KEY REFERENCES public.cotacao_itens(id) ON DELETE CASCADE,
  cotacao_fornecedor_id uuid NOT NULL REFERENCES public.cotacao_fornecedores(id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_decisao TO authenticated;
GRANT ALL ON public.cotacao_decisao TO service_role;
ALTER TABLE public.cotacao_decisao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo cot_dec" ON public.cotacao_decisao FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'cotacoes')) WITH CHECK (public.tem_modulo(auth.uid(),'cotacoes'));

CREATE OR REPLACE FUNCTION public.cotacao_marca_sc_em_cotacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.solicitacoes_compra SET status='em_cotacao', updated_at=now()
    WHERE id = NEW.solicitacao_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_cot_sc AFTER INSERT ON public.cotacao_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.cotacao_marca_sc_em_cotacao();

CREATE TABLE public.cotacao_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome text,
  fornecedor_email text,
  fornecedor_telefone text,
  canal text NOT NULL CHECK (canal IN ('email','whatsapp')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro')),
  erro text,
  mensagem_id text,
  enviado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_envios TO authenticated;
GRANT ALL ON public.cotacao_envios TO service_role;
ALTER TABLE public.cotacao_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo cot_envios" ON public.cotacao_envios FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'cotacoes')) WITH CHECK (public.tem_modulo(auth.uid(),'cotacoes'));
CREATE TRIGGER trg_cotacao_envios_updated_at BEFORE UPDATE ON public.cotacao_envios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_cotacao_envios_cotacao ON public.cotacao_envios(cotacao_id);

-- Ordens de compra
CREATE SEQUENCE public.ordens_compra_numero_seq;
CREATE TABLE public.ordens_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL DEFAULT nextval('public.ordens_compra_numero_seq'),
  solicitacao_id UUID REFERENCES public.solicitacoes_compra(id) ON DELETE SET NULL,
  solicitacao_item_id UUID REFERENCES public.solicitacao_itens(id) ON DELETE SET NULL,
  cotacao_id UUID REFERENCES public.cotacoes(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  comprador_id uuid,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  total NUMERIC NOT NULL DEFAULT 0,
  prazo_entrega DATE,
  data_emissao date DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ag_talieng',
  observacao TEXT,
  condicao_pagamento text,
  contrato_empreiteiro text,
  cei_obra text,
  frete_tipo text DEFAULT 'CIF',
  frete_valor numeric DEFAULT 0,
  ipi numeric DEFAULT 0,
  desconto numeric DEFAULT 0,
  garantia_anos integer,
  forma_pagamento text,
  condicoes_entrega text,
  detalhe_pagamento text,
  banco text,
  agencia text,
  conta text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_compra TO authenticated;
GRANT ALL ON public.ordens_compra TO service_role;
ALTER TABLE public.ordens_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo ordens" ON public.ordens_compra FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'ordens')) WITH CHECK (public.tem_modulo(auth.uid(),'ordens'));
CREATE TRIGGER trg_ordens_updated BEFORE UPDATE ON public.ordens_compra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.oc_set_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.total := COALESCE(NEW.preco_unitario,0)*COALESCE(NEW.quantidade,0)
             + COALESCE(NEW.frete_valor,0) + COALESCE(NEW.ipi,0) - COALESCE(NEW.desconto,0);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_oc_set_total BEFORE INSERT OR UPDATE ON public.ordens_compra
  FOR EACH ROW EXECUTE FUNCTION public.oc_set_total();

CREATE TABLE public.ordem_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid NOT NULL REFERENCES public.ordens_compra(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text,
  preco_unitario numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordem_itens TO authenticated;
GRANT ALL ON public.ordem_itens TO service_role;
ALTER TABLE public.ordem_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo ordem_itens" ON public.ordem_itens FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'ordens')) WITH CHECK (public.tem_modulo(auth.uid(),'ordens'));

CREATE OR REPLACE FUNCTION public.ordem_item_set_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.total := COALESCE(NEW.preco_unitario,0) * COALESCE(NEW.quantidade,0);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ord_item_total BEFORE INSERT OR UPDATE ON public.ordem_itens
  FOR EACH ROW EXECUTE FUNCTION public.ordem_item_set_total();

CREATE OR REPLACE FUNCTION public.recalc_ordem_total(p_ordem uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_sum numeric; v_frete numeric; v_ipi numeric; v_desc numeric; v_pu numeric; v_q numeric;
BEGIN
  SELECT COALESCE(SUM(total),0) INTO v_sum FROM public.ordem_itens WHERE ordem_id=p_ordem;
  SELECT COALESCE(frete_valor,0), COALESCE(ipi,0), COALESCE(desconto,0),
         COALESCE(preco_unitario,0), COALESCE(quantidade,0)
    INTO v_frete, v_ipi, v_desc, v_pu, v_q
    FROM public.ordens_compra WHERE id=p_ordem;
  IF v_sum = 0 THEN v_sum := v_pu * v_q; END IF;
  UPDATE public.ordens_compra SET total = v_sum + v_frete + v_ipi - v_desc, updated_at=now() WHERE id=p_ordem;
END $$;
REVOKE EXECUTE ON FUNCTION public.recalc_ordem_total(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_recalc_ordem_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_ordem_total(COALESCE(NEW.ordem_id, OLD.ordem_id));
  RETURN NULL;
END $$;
CREATE TRIGGER trg_ord_item_recalc AFTER INSERT OR UPDATE OR DELETE ON public.ordem_itens
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_ordem_total();

-- Contas a pagar / receber
CREATE TABLE public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  ordem_compra_id UUID REFERENCES public.ordens_compra(id) ON DELETE SET NULL,
  valor NUMERIC NOT NULL,
  vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_pagar TO authenticated;
GRANT ALL ON public.contas_pagar TO service_role;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo cp" ON public.contas_pagar FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'financeiro')) WITH CHECK (public.tem_modulo(auth.uid(),'financeiro'));
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  cliente TEXT,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  valor NUMERIC NOT NULL,
  vencimento DATE NOT NULL,
  data_recebimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_receber TO authenticated;
GRANT ALL ON public.contas_receber TO service_role;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo cr" ON public.contas_receber FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'financeiro')) WITH CHECK (public.tem_modulo(auth.uid(),'financeiro'));
CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.oc_gera_conta_pagar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric; v_venc date; v_dias int; v_desc text;
BEGIN
  v_total := COALESCE(NEW.total, NEW.preco_unitario * NEW.quantidade);
  v_dias := COALESCE(NULLIF(regexp_replace(COALESCE(NEW.condicao_pagamento,''), '\D','','g'),'')::int, 30);
  v_venc := COALESCE(NEW.prazo_entrega, CURRENT_DATE) + v_dias;
  v_desc := 'OC #' || lpad(NEW.numero::text, 5, '0');
  INSERT INTO public.contas_pagar (descricao, valor, vencimento, status, fornecedor_id, obra_id, ordem_compra_id, centro_custo_id)
    VALUES (v_desc, v_total, v_venc, 'pendente', NEW.fornecedor_id, NEW.obra_id, NEW.id, NEW.centro_custo_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_oc_conta_pagar AFTER INSERT ON public.ordens_compra
  FOR EACH ROW EXECUTE FUNCTION public.oc_gera_conta_pagar();

-- Documentos
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  tipo TEXT,
  storage_path TEXT NOT NULL,
  tamanho BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view docs" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "write docs" ON public.documentos FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'obras') OR public.tem_modulo(auth.uid(),'ordens'))
  WITH CHECK (public.tem_modulo(auth.uid(),'obras') OR public.tem_modulo(auth.uid(),'ordens'));

-- Orçamento por obra/categoria
CREATE TABLE public.obra_orcamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  custo_previsto numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (obra_id, categoria_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_orcamento TO authenticated;
GRANT ALL ON public.obra_orcamento TO service_role;
ALTER TABLE public.obra_orcamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulo obra_orc" ON public.obra_orcamento FOR ALL TO authenticated
  USING (public.tem_modulo(auth.uid(),'obras')) WITH CHECK (public.tem_modulo(auth.uid(),'obras'));

-- Config empresa
CREATE TABLE public.empresa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT 'Empresa',
  razao_social text,
  cnpj text,
  endereco text,
  cidade text,
  uf text,
  cep text,
  telefone text,
  contato text,
  email text,
  banco text,
  agencia text,
  conta text,
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.empresa_config TO authenticated;
GRANT ALL ON public.empresa_config TO service_role;
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view empresa" ON public.empresa_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin empresa" ON public.empresa_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.empresa_config (nome, razao_social, cnpj, endereco, cidade, uf, cep, telefone, contato)
  VALUES ('TALIENG ENGENHARIA CIVIL','TALIENG ENGENHARIA LTDA','37.589.783/0001-09',
          'Rua Mal. Deodoro 2034, Alto da XV','Curitiba','PR','80045-090',
          '(41) 3149-3446 / 99501-3902','Departamento de Compras');
