
-- Enum tipo_compra
DO $$ BEGIN
  CREATE TYPE public.tipo_compra AS ENUM ('material','mao_de_obra');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- solicitacoes_compra
ALTER TABLE public.solicitacoes_compra
  ADD COLUMN IF NOT EXISTS tipo_compra public.tipo_compra NOT NULL DEFAULT 'material',
  ADD COLUMN IF NOT EXISTS prazo_entrega_esperado date;

-- cotacoes
ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS tipo_compra public.tipo_compra NOT NULL DEFAULT 'material',
  ADD COLUMN IF NOT EXISTS para_contratacao boolean NOT NULL DEFAULT false;

-- cotacao_precos: campos de equalização
ALTER TABLE public.cotacao_precos
  ADD COLUMN IF NOT EXISTS valor_com_desconto numeric,
  ADD COLUMN IF NOT EXISTS frete numeric NOT NULL DEFAULT 0;

-- cotacao_envios: anexo por fornecedor
ALTER TABLE public.cotacao_envios
  ADD COLUMN IF NOT EXISTS anexo_path text;

-- ordens_compra
ALTER TABLE public.ordens_compra
  ADD COLUMN IF NOT EXISTS tipo_compra public.tipo_compra NOT NULL DEFAULT 'material',
  ADD COLUMN IF NOT EXISTS faturamento_direto boolean NOT NULL DEFAULT false;

-- contas_pagar
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS tipo_compra public.tipo_compra,
  ADD COLUMN IF NOT EXISTS categoria_conta text,
  ADD COLUMN IF NOT EXISTS modo_lancamento text NOT NULL DEFAULT 'integral',
  ADD COLUMN IF NOT EXISTS nota_fiscal_path text,
  ADD COLUMN IF NOT EXISTS boleto_path text;

DO $$ BEGIN
  ALTER TABLE public.contas_pagar
    ADD CONSTRAINT contas_pagar_categoria_conta_chk
    CHECK (categoria_conta IS NULL OR categoria_conta IN ('material','mao_de_obra','imposto'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contas_pagar
    ADD CONSTRAINT contas_pagar_modo_lancamento_chk
    CHECK (modo_lancamento IN ('integral','parcial','avulso'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ajuste do trigger: pular geração se faturamento_direto, herdar tipo_compra
CREATE OR REPLACE FUNCTION public.oc_gera_conta_pagar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_total numeric; v_venc date; v_dias int; v_desc text;
BEGIN
  IF NEW.faturamento_direto THEN
    RETURN NEW;
  END IF;
  v_total := COALESCE(NEW.total, NEW.preco_unitario * NEW.quantidade);
  v_dias := COALESCE(NULLIF(regexp_replace(COALESCE(NEW.condicao_pagamento,''), '\D','','g'),'')::int, 30);
  v_venc := COALESCE(NEW.prazo_entrega, CURRENT_DATE) + v_dias;
  v_desc := 'OC #' || lpad(NEW.numero::text, 5, '0');
  INSERT INTO public.contas_pagar
    (descricao, valor, vencimento, status, fornecedor_id, obra_id, ordem_compra_id, centro_custo_id, tipo_compra, categoria_conta, modo_lancamento)
  VALUES (v_desc, v_total, v_venc, 'pendente', NEW.fornecedor_id, NEW.obra_id, NEW.id, NEW.centro_custo_id,
          NEW.tipo_compra,
          CASE WHEN NEW.tipo_compra = 'mao_de_obra' THEN 'mao_de_obra' ELSE 'material' END,
          'integral');
  RETURN NEW;
END;
$function$;
