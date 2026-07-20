## Visão geral

Atualização estrutural do TaliControl para introduzir a classificação **Material / Mão de Obra** em todo o fluxo de compras, reformular Cotações com equalização dedicada, adicionar **Faturamento Direto** nas OCs e permitir Contas a Pagar avulsas (com/sem OC, integrais/parciais).

Mantém tudo o que já funciona hoje (permissões por módulo, geração automática de centro de custo por obra, sequências de numeração, RLS, storage `documentos`).

---

## 1. Banco de dados (migração única)

Novo enum e colunas — nada é removido de forma destrutiva; campos legados ficam nullable para preservar histórico.

- `create type public.tipo_compra as enum ('material','mao_de_obra');`
- `solicitacoes_compra`:
  - `tipo_compra tipo_compra not null default 'material'` (backfill = 'material')
  - `prazo_entrega_esperado date` (obrigatório na UI a partir de agora)
  - manter coluna `urgencia` no banco por compatibilidade, apenas removida da UI
- `cotacoes`:
  - `tipo_compra tipo_compra not null default 'material'`
  - `para_contratacao boolean not null default false`
- `cotacao_envios` (equalização por fornecedor/item já existe via `cotacao_precos`):
  - garantir colunas `valor_unitario numeric`, `valor_com_desconto numeric`, `frete numeric` em `cotacao_precos` (adicionar as que faltarem)
  - `cotacao_envios.anexo_path text` para PDF/imagem por fornecedor (usa bucket `documentos`)
- `ordens_compra`:
  - `tipo_compra tipo_compra not null default 'material'`
  - `faturamento_direto boolean not null default false`
- `contas_pagar`:
  - `tipo_compra tipo_compra` (nullable — permite DAS/impostos sem tipo)
  - `categoria_conta text check (categoria_conta in ('material','mao_de_obra','imposto')) `
  - `modo_lancamento text check (modo_lancamento in ('integral','parcial','avulso')) default 'integral'`
  - `nota_fiscal_path text`, `boleto_path text`
- Trigger `oc_gera_conta_pagar`: passar a **só** criar Conta a Pagar quando `faturamento_direto = false` e herdar `tipo_compra`.
- Trigger que propaga `tipo_compra` da solicitação → cotação → OC (via função e default no insert), impedindo alteração manual em cotação (checado na UI e num trigger `BEFORE UPDATE` que rejeita mudança quando vem de solicitação).

Grants/RLS: novas colunas herdam as políticas existentes; nenhuma tabela nova.

---

## 2. Solicitações (UI)

Arquivo: `src/pages/Solicitacoes.tsx`

- Adicionar select **Tipo da Solicitação** (Material / Mão de Obra) — obrigatório.
- Remover input de **Urgência** do formulário e das colunas visíveis.
- Adicionar input **Prazo de Entrega Esperado** (date) — obrigatório.
- Exibir badge do tipo na listagem.

---

## 3. Cotações (UI)

Arquivos: `src/pages/Cotacoes.tsx` (+ eventual `CotacaoForm`)

- Ao criar cotação a partir de solicitação: gravar `tipo_compra` da solicitação; campo fica **read-only**.
- Validação de fornecedores:
  - `para_contratacao = false` → mínimo 2, máximo 8.
  - `para_contratacao = true` → exatamente 1 fornecedor; ocultar UI de múltiplas propostas.
- Checkbox **Cotação para Contratação**.

---

## 4. Equalização (nova tela)

Nova rota `/cotacoes/:id/equalizacao` → `src/pages/CotacaoEqualizacao.tsx`.

Layout: matriz fornecedores × itens.

- Por célula: Valor Unitário, Valor após Desconto, Frete (edição inline; grava em `cotacao_precos`).
- Upload de anexo por fornecedor (bucket `documentos`, gravado em `cotacao_envios.anexo_path`).
- Coluna calculada **Cotação Ótima** = menor `valor_com_desconto` (fallback `valor_unitario`) por item.
- Botão "Selecionar vencedor" por item/fornecedor grava em `cotacao_decisao`; botão da coluna Ótima é desabilitado.

Adicionar link "Equalização" na listagem de cotações.

---

## 5. Ordens de Compra (UI)

Arquivos: `src/pages/OrdemForm.tsx`, `src/pages/Ordens.tsx`

- Herdar `tipo_compra` da cotação/solicitação de origem (read-only).
- Adicionar switch **Faturamento Direto** (Sim/Não).
- Exibir ambos os campos na listagem.

---

## 6. Contas a Pagar (UI)

Arquivo: `src/pages/Contas.tsx` (modo `pagar`)

Reformular o dialog "Nova":

- Toggle: **Com OC** / **Sem OC**.

**Com OC:**
- Select da OC (apenas OCs sem faturamento direto e ainda sem conta integral).
- Modo: **Integral** ou **Parcial**.
  - Integral: preenche automaticamente valor total, centro de custo, tipo.
  - Parcial: tabela dos itens da OC com quantidade parcial + campo Frete; total calculado. Centro de custo e tipo herdados.

**Sem OC (avulso):**
- Categoria: Material / Mão de Obra / Imposto (DAS).
- Centro de custo, vencimento, valor, descrição.
- Uploads separados: Nota Fiscal e Boleto (bucket `documentos`).

Trigger da OC continua criando a conta integral automaticamente quando `faturamento_direto = false`.

---

## Detalhes técnicos

**Backfill**: `UPDATE solicitacoes_compra SET tipo_compra='material' WHERE tipo_compra IS NULL` idem para `cotacoes`, `ordens_compra` (default do enum cobre novos registros).

**Impacto em código**: mudanças concentradas em `Solicitacoes.tsx`, `Cotacoes.tsx`, novo `CotacaoEqualizacao.tsx`, `OrdemForm.tsx`, `Ordens.tsx`, `Contas.tsx` + rota no `App.tsx`. Componentes compartilhados (`CentroCustoSelect`, `StatusBadge`, `PageHeader`) reutilizados.

**Compatibilidade**: nenhuma coluna removida; triggers existentes ajustadas com `IF` para `faturamento_direto`; RLS preservada.

**Não escopo**: reescrever numeração, permissões, ou telas fora do fluxo de compras/financeiro.

---

## Ordem de execução

1. Migração SQL (enum + colunas + ajuste do trigger `oc_gera_conta_pagar`).
2. Atualizar `Solicitacoes.tsx`.
3. Atualizar `Cotacoes.tsx` + criar `CotacaoEqualizacao.tsx` + rota.
4. Atualizar `OrdemForm.tsx` / `Ordens.tsx`.
5. Reformular `Contas.tsx`.
6. Smoke test via Playwright em `/solicitacoes`, `/cotacoes`, `/ordens`, `/contas-pagar`.
