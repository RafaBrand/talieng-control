
-- Expandir módulos de permissão
ALTER TYPE public.app_modulo ADD VALUE IF NOT EXISTS 'usuarios';
ALTER TYPE public.app_modulo ADD VALUE IF NOT EXISTS 'relatorios';
ALTER TYPE public.app_modulo ADD VALUE IF NOT EXISTS 'dashboard';

-- Frete por fornecedor (único, aplicado ao total do fornecedor, como no OC de referência)
ALTER TABLE public.cotacao_fornecedores
  ADD COLUMN IF NOT EXISTS frete_total numeric NOT NULL DEFAULT 0;
