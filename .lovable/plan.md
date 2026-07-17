## Visão geral

O projeto original é um SaaS de gestão de obras (Vite + React Router + Supabase) com 18 páginas em português, sistema de permissões por módulo, RBAC (admin/user), 11 migrações e integração com Supabase Auth + Edge Functions. Preciso portá-lo para o stack atual (TanStack Start v1 + Lovable Cloud), mantendo funcionalidades 1:1.

Como é uma migração grande (~3.300 linhas só de páginas, além de hooks, integrações e componentes), vou executar em **fases sequenciais** — cada fase é uma entrega funcional e será feita em turnos separados.

## Fase 1 — Backend e fundação (este turno)

1. Ativar Lovable Cloud.
2. Consolidar as 11 migrações do zip em uma única migração idempotente e aplicá-la (tabelas: `profiles`, `user_roles`, `obras`, `fornecedores`, `categorias`, `centros_custo`, `insumos`, `solicitacoes`, `cotacoes`, `ordens`, `ordem_itens`, `contas_pagar`, `contas_receber`, `documentos`, `configuracoes`, módulos de permissão, etc.), com RLS, policies, funções `has_role`/`is_admin`, triggers e GRANTs.
3. Configurar auth (email/senha).
4. Portar arquivos base: `src/integrations/supabase/types.ts` (regerado), hooks `useAuth`, `usePermissions`, componentes `AppLayout`, `AppSidebar`, `ProtectedRoute`, `RequireModule`, `PageHeader`, `StatusBadge`, `CentroCustoSelect`, `NavLink`.
5. Estrutura de rotas TanStack: `_authenticated/route.tsx` (gate), `/auth` (login/signup), `/` (dashboard placeholder), `__root.tsx` com providers.
6. Copiar `src/index.css` (design tokens) e componentes `ui/` do shadcn que faltarem.

Entrega da Fase 1: usuário consegue fazer login, ver sidebar com todos os módulos e navegar (páginas ainda vazias).

## Fase 2 — Módulos operacionais

Portar páginas: `Dashboard`, `Obras`, `Fornecedores`, `Categorias`, `CentrosCusto`, `Insumos`.

## Fase 3 — Fluxo de compras

Portar `Solicitacoes`, `Cotacoes` (752 linhas — a maior), `Ordens`, `OrdemForm`.

## Fase 4 — Financeiro + admin

Portar `Contas` (pagar/receber), `Fluxo`, `Documentos`, `Usuarios`, `Configuracoes`.

## Detalhes técnicos

- **Roteamento**: cada rota do React Router vira arquivo em `src/routes/`. Rotas protegidas ficam em `_authenticated/`. Rotas com params (`/ordens/:id/editar`) viram `_authenticated/ordens.$id.editar.tsx`.
- **Permissões por módulo**: mantenho o padrão `RequireModule` como wrapper de componente (não como beforeLoad) para preservar a lógica exata do original.
- **Dados**: uso o cliente `@/integrations/supabase/client` direto nas páginas (padrão do original), já que o template Lovable Supabase gerencia sessão/RLS pelo browser client. Não vou converter para `createServerFn` — manteria a paridade e evitaria reescrever 3.300 linhas.
- **Migrações**: consolidadas para evitar dependência de ordem entre 11 arquivos separados.
- **Edge Functions**: se as originais existirem em `supabase/functions/`, viram TanStack server routes/functions equivalentes na fase correspondente.
- **Dependências**: instalar `exceljs`, `file-saver`, `jspdf`, `jspdf-autotable`, `date-fns`, `recharts`, e demais que já não estejam no template.
- **Placeholder `/`**: substituído pelo Dashboard no gate autenticado; usuário deslogado é redirecionado para `/auth`.

## Confirmação

Confirmando o plano, começo pela **Fase 1** agora mesmo. As fases 2–4 acontecem nos próximos turnos conforme você validar cada entrega.
