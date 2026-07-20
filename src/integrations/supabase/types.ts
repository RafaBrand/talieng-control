export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      centros_custo: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          obra_id: string | null
          tipo: Database["public"]["Enums"]["centro_custo_tipo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          obra_id?: string | null
          tipo?: Database["public"]["Enums"]["centro_custo_tipo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          obra_id?: string | null
          tipo?: Database["public"]["Enums"]["centro_custo_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          boleto_path: string | null
          categoria_conta: string | null
          centro_custo_id: string | null
          created_at: string
          data_pagamento: string | null
          descricao: string
          fornecedor_id: string | null
          id: string
          modo_lancamento: string
          nota_fiscal_path: string | null
          obra_id: string | null
          ordem_compra_id: string | null
          status: string
          tipo_compra: Database["public"]["Enums"]["tipo_compra"] | null
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          boleto_path?: string | null
          categoria_conta?: string | null
          centro_custo_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao: string
          fornecedor_id?: string | null
          id?: string
          modo_lancamento?: string
          nota_fiscal_path?: string | null
          obra_id?: string | null
          ordem_compra_id?: string | null
          status?: string
          tipo_compra?: Database["public"]["Enums"]["tipo_compra"] | null
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          boleto_path?: string | null
          categoria_conta?: string | null
          centro_custo_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          modo_lancamento?: string
          nota_fiscal_path?: string | null
          obra_id?: string | null
          ordem_compra_id?: string | null
          status?: string
          tipo_compra?: Database["public"]["Enums"]["tipo_compra"] | null
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_ordem_compra_id_fkey"
            columns: ["ordem_compra_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          centro_custo_id: string | null
          cliente: string | null
          created_at: string
          data_recebimento: string | null
          descricao: string
          id: string
          obra_id: string | null
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          centro_custo_id?: string | null
          cliente?: string | null
          created_at?: string
          data_recebimento?: string | null
          descricao: string
          id?: string
          obra_id?: string | null
          status?: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          centro_custo_id?: string | null
          cliente?: string | null
          created_at?: string
          data_recebimento?: string | null
          descricao?: string
          id?: string
          obra_id?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_decisao: {
        Row: {
          cotacao_fornecedor_id: string
          cotacao_item_id: string
        }
        Insert: {
          cotacao_fornecedor_id: string
          cotacao_item_id: string
        }
        Update: {
          cotacao_fornecedor_id?: string
          cotacao_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_decisao_cotacao_fornecedor_id_fkey"
            columns: ["cotacao_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "cotacao_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_decisao_cotacao_item_id_fkey"
            columns: ["cotacao_item_id"]
            isOneToOne: true
            referencedRelation: "cotacao_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_envios: {
        Row: {
          anexo_path: string | null
          canal: string
          cotacao_id: string
          created_at: string
          enviado_por: string | null
          erro: string | null
          fornecedor_email: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          fornecedor_telefone: string | null
          id: string
          mensagem_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          anexo_path?: string | null
          canal: string
          cotacao_id: string
          created_at?: string
          enviado_por?: string | null
          erro?: string | null
          fornecedor_email?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          fornecedor_telefone?: string | null
          id?: string
          mensagem_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          anexo_path?: string | null
          canal?: string
          cotacao_id?: string
          created_at?: string
          enviado_por?: string | null
          erro?: string | null
          fornecedor_email?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          fornecedor_telefone?: string | null
          id?: string
          mensagem_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_envios_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_envios_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_fornecedores: {
        Row: {
          condicao_pagamento: string | null
          cotacao_id: string
          fornecedor_id: string | null
          id: string
          nome_avulso: string | null
          ordem: number
          prazo_entrega: string | null
        }
        Insert: {
          condicao_pagamento?: string | null
          cotacao_id: string
          fornecedor_id?: string | null
          id?: string
          nome_avulso?: string | null
          ordem?: number
          prazo_entrega?: string | null
        }
        Update: {
          condicao_pagamento?: string | null
          cotacao_id?: string
          fornecedor_id?: string | null
          id?: string
          nome_avulso?: string | null
          ordem?: number
          prazo_entrega?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_fornecedores_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_itens: {
        Row: {
          cotacao_id: string
          id: string
          item: string
          ordem: number
          quantidade: number
          solicitacao_item_id: string | null
          unidade: string | null
        }
        Insert: {
          cotacao_id: string
          id?: string
          item: string
          ordem?: number
          quantidade?: number
          solicitacao_item_id?: string | null
          unidade?: string | null
        }
        Update: {
          cotacao_id?: string
          id?: string
          item?: string
          ordem?: number
          quantidade?: number
          solicitacao_item_id?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_itens_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_itens_solicitacao_item_id_fkey"
            columns: ["solicitacao_item_id"]
            isOneToOne: false
            referencedRelation: "solicitacao_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_precos: {
        Row: {
          cotacao_fornecedor_id: string
          cotacao_item_id: string
          frete: number
          id: string
          preco_unitario: number
          valor_com_desconto: number | null
        }
        Insert: {
          cotacao_fornecedor_id: string
          cotacao_item_id: string
          frete?: number
          id?: string
          preco_unitario?: number
          valor_com_desconto?: number | null
        }
        Update: {
          cotacao_fornecedor_id?: string
          cotacao_item_id?: string
          frete?: number
          id?: string
          preco_unitario?: number
          valor_com_desconto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_precos_cotacao_fornecedor_id_fkey"
            columns: ["cotacao_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "cotacao_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_precos_cotacao_item_id_fkey"
            columns: ["cotacao_item_id"]
            isOneToOne: false
            referencedRelation: "cotacao_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_solicitacoes: {
        Row: {
          cotacao_id: string
          solicitacao_id: string
        }
        Insert: {
          cotacao_id: string
          solicitacao_id: string
        }
        Update: {
          cotacao_id?: string
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_solicitacoes_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_solicitacoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          created_at: string
          criado_por: string | null
          endereco_entrega: string | null
          id: string
          numero: number
          obra_id: string | null
          observacao: string | null
          para_contratacao: boolean
          status: string
          tipo_compra: Database["public"]["Enums"]["tipo_compra"]
          updated_at: string
          usa_endereco_obra: boolean
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          endereco_entrega?: string | null
          id?: string
          numero?: number
          obra_id?: string | null
          observacao?: string | null
          para_contratacao?: boolean
          status?: string
          tipo_compra?: Database["public"]["Enums"]["tipo_compra"]
          updated_at?: string
          usa_endereco_obra?: boolean
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          endereco_entrega?: string | null
          id?: string
          numero?: number
          obra_id?: string | null
          observacao?: string | null
          para_contratacao?: boolean
          status?: string
          tipo_compra?: Database["public"]["Enums"]["tipo_compra"]
          updated_at?: string
          usa_endereco_obra?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          created_at: string
          id: string
          nome: string
          obra_id: string | null
          storage_path: string
          tamanho: number | null
          tipo: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          obra_id?: string | null
          storage_path: string
          tamanho?: number | null
          tipo?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          obra_id?: string | null
          storage_path?: string
          tamanho?: number | null
          tipo?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          agencia: string | null
          banco: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          conta: string | null
          contato: string | null
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          razao_social: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: string | null
          contato?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: string | null
          contato?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          categoria_id: string | null
          cnpj: string | null
          contato: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          categoria_id: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_orcamento: {
        Row: {
          categoria_id: string
          created_at: string
          custo_previsto: number
          id: string
          obra_id: string
          updated_at: string
        }
        Insert: {
          categoria_id: string
          created_at?: string
          custo_previsto?: number
          id?: string
          obra_id: string
          updated_at?: string
        }
        Update: {
          categoria_id?: string
          created_at?: string
          custo_previsto?: number
          id?: string
          obra_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_orcamento_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_orcamento_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cliente: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          endereco: string | null
          id: string
          nome: string
          status: string
          updated_at: string
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          endereco?: string | null
          id?: string
          nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          cliente?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ordem_itens: {
        Row: {
          created_at: string
          descricao: string
          id: string
          ordem: number
          ordem_id: string
          preco_unitario: number
          quantidade: number
          total: number
          unidade: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          ordem?: number
          ordem_id: string
          preco_unitario?: number
          quantidade?: number
          total?: number
          unidade?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          ordem_id?: string
          preco_unitario?: number
          quantidade?: number
          total?: number
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordem_itens_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_compra: {
        Row: {
          agencia: string | null
          banco: string | null
          categoria_id: string | null
          cei_obra: string | null
          centro_custo_id: string | null
          comprador_id: string | null
          condicao_pagamento: string | null
          condicoes_entrega: string | null
          conta: string | null
          contrato_empreiteiro: string | null
          cotacao_id: string | null
          created_at: string
          data_emissao: string | null
          desconto: number | null
          detalhe_pagamento: string | null
          faturamento_direto: boolean
          forma_pagamento: string | null
          fornecedor_id: string | null
          frete_tipo: string | null
          frete_valor: number | null
          garantia_anos: number | null
          id: string
          ipi: number | null
          numero: number
          obra_id: string | null
          observacao: string | null
          prazo_entrega: string | null
          preco_unitario: number
          quantidade: number
          solicitacao_id: string | null
          solicitacao_item_id: string | null
          status: string
          tipo_compra: Database["public"]["Enums"]["tipo_compra"]
          total: number
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          categoria_id?: string | null
          cei_obra?: string | null
          centro_custo_id?: string | null
          comprador_id?: string | null
          condicao_pagamento?: string | null
          condicoes_entrega?: string | null
          conta?: string | null
          contrato_empreiteiro?: string | null
          cotacao_id?: string | null
          created_at?: string
          data_emissao?: string | null
          desconto?: number | null
          detalhe_pagamento?: string | null
          faturamento_direto?: boolean
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          frete_tipo?: string | null
          frete_valor?: number | null
          garantia_anos?: number | null
          id?: string
          ipi?: number | null
          numero?: number
          obra_id?: string | null
          observacao?: string | null
          prazo_entrega?: string | null
          preco_unitario?: number
          quantidade?: number
          solicitacao_id?: string | null
          solicitacao_item_id?: string | null
          status?: string
          tipo_compra?: Database["public"]["Enums"]["tipo_compra"]
          total?: number
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          categoria_id?: string | null
          cei_obra?: string | null
          centro_custo_id?: string | null
          comprador_id?: string | null
          condicao_pagamento?: string | null
          condicoes_entrega?: string | null
          conta?: string | null
          contrato_empreiteiro?: string | null
          cotacao_id?: string | null
          created_at?: string
          data_emissao?: string | null
          desconto?: number | null
          detalhe_pagamento?: string | null
          faturamento_direto?: boolean
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          frete_tipo?: string | null
          frete_valor?: number | null
          garantia_anos?: number | null
          id?: string
          ipi?: number | null
          numero?: number
          obra_id?: string | null
          observacao?: string | null
          prazo_entrega?: string | null
          preco_unitario?: number
          quantidade?: number
          solicitacao_id?: string | null
          solicitacao_item_id?: string | null
          status?: string
          tipo_compra?: Database["public"]["Enums"]["tipo_compra"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_compra_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_solicitacao_item_id_fkey"
            columns: ["solicitacao_item_id"]
            isOneToOne: false
            referencedRelation: "solicitacao_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      solicitacao_itens: {
        Row: {
          created_at: string
          id: string
          insumo_id: string | null
          item: string
          observacao: string | null
          quantidade: number
          solicitacao_id: string
          unidade: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_id?: string | null
          item: string
          observacao?: string | null
          quantidade?: number
          solicitacao_id: string
          unidade?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insumo_id?: string | null
          item?: string
          observacao?: string | null
          quantidade?: number
          solicitacao_id?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_itens_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacao_itens_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_compra: {
        Row: {
          centro_custo_id: string | null
          created_at: string
          id: string
          numero: number
          obra_id: string
          observacao: string | null
          prazo_entrega_esperado: string | null
          solicitante_id: string | null
          status: string
          tipo_compra: Database["public"]["Enums"]["tipo_compra"]
          titulo: string | null
          updated_at: string
          urgencia: string
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          numero?: number
          obra_id: string
          observacao?: string | null
          prazo_entrega_esperado?: string | null
          solicitante_id?: string | null
          status?: string
          tipo_compra?: Database["public"]["Enums"]["tipo_compra"]
          titulo?: string | null
          updated_at?: string
          urgencia?: string
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string
          id?: string
          numero?: number
          obra_id?: string
          observacao?: string | null
          prazo_entrega_esperado?: string | null
          solicitante_id?: string | null
          status?: string
          tipo_compra?: Database["public"]["Enums"]["tipo_compra"]
          titulo?: string | null
          updated_at?: string
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_compra_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modulos: {
        Row: {
          id: string
          modulo: Database["public"]["Enums"]["app_modulo"]
          user_id: string
        }
        Insert: {
          id?: string
          modulo: Database["public"]["Enums"]["app_modulo"]
          user_id: string
        }
        Update: {
          id?: string
          modulo?: Database["public"]["Enums"]["app_modulo"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_cc_codigo_obra: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalc_ordem_total: { Args: { p_ordem: string }; Returns: undefined }
      tem_modulo: {
        Args: {
          _modulo: Database["public"]["Enums"]["app_modulo"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_modulo:
        | "solicitacoes"
        | "cotacoes"
        | "ordens"
        | "financeiro"
        | "obras"
        | "fornecedores"
        | "insumos"
      app_role: "admin" | "usuario"
      centro_custo_tipo: "obra" | "administrativo" | "personalizado"
      tipo_compra: "material" | "mao_de_obra"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_modulo: [
        "solicitacoes",
        "cotacoes",
        "ordens",
        "financeiro",
        "obras",
        "fornecedores",
        "insumos",
      ],
      app_role: ["admin", "usuario"],
      centro_custo_tipo: ["obra", "administrativo", "personalizado"],
      tipo_compra: ["material", "mao_de_obra"],
    },
  },
} as const
