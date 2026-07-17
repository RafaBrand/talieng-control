import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import templateUrl from "@/assets/oc-template.xlsx?url";

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "";

/**
 * Preenche o template oficial da OC (XLSX) preservando todo o layout,
 * mesclagens e formatação, e dispara o download.
 *
 * Estrutura do template (sheet "Ordem de Compra"):
 *  - Cabeçalho: K5/L5="Número:"  M5:O5=valor   P5="Data:"  Q5=valor    L7="Comprador:" M7=valor
 *  - Bloco esquerdo (Local de Entrega/Obra): C12..C15 labels; valores em D/G/I
 *  - Bloco direito (Fornecedor):              K12..K15 labels; valores em M/O/P
 *  - Faturamento (esquerda, linhas 17-22):    C18..C22 labels; valores em D/G
 *  - Itens linhas 27..33: B=Item, C=Qtde, D=Unidade, E:O=Descrição, P=Unit, Q=Total
 *  - Totais O35..O39 (labels) / Q35..Q39 (valores)
 *  - Frete CIF/FOB: C37/C38 labels (X em B37/B38)
 *  - Bancários: F37/F38/F39 labels, valores em G37:H37, G38:H38, G39:H39
 *  - Garantia: J42 label, valor em K42 (L42 = "Ano")
 */
export async function gerarExcelOrdem(ordemOrId: any) {
  let ordem: any = ordemOrId;
  if (typeof ordemOrId === "string") {
    const { data } = await supabase
      .from("ordens_compra")
      .select("*, fornecedores(*), obras(*)")
      .eq("id", ordemOrId)
      .maybeSingle();
    ordem = data;
  }
  if (!ordem) return;

  const [{ data: cfg }, { data: itensRaw }, { data: comprador }] = await Promise.all([
    supabase.from("empresa_config").select("*").limit(1).maybeSingle(),
    supabase.from("ordem_itens").select("*").eq("ordem_id", ordem.id).order("ordem"),
    ordem.comprador_id
      ? supabase.from("profiles").select("nome").eq("user_id", ordem.comprador_id).maybeSingle()
      : Promise.resolve({ data: null as any }),
  ]);

  let forn: any = ordem.fornecedores;
  if (!forn && ordem.fornecedor_id) {
    const { data } = await supabase.from("fornecedores").select("*").eq("id", ordem.fornecedor_id).maybeSingle();
    forn = data;
  }
  let obra: any = ordem.obras;
  if (!obra && ordem.obra_id) {
    const { data } = await supabase.from("obras").select("*").eq("id", ordem.obra_id).maybeSingle();
    obra = data;
  }

  const empresa: any = cfg || {};
  const itens: any[] = itensRaw || [];

  // Carrega o template
  const buf = await (await fetch(templateUrl)).arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet("Ordem de Compra") || wb.worksheets[0];

  const set = (addr: string, value: any) => {
    try { ws.getCell(addr).value = value; } catch { /* merged cells safe */ }
  };

  // ===== Cabeçalho =====
  set("M5", `OC ${String(ordem.numero ?? "").padStart(2, "0")}`);
  set("Q5", fmtDate(ordem.data_emissao || ordem.created_at?.slice(0, 10)));
  set("M7", comprador?.nome || "");

  // ===== Local de Entrega / Obra (bloco ESQUERDO) =====
  set("D12", obra?.nome || "");
  set("D13", obra?.endereco || "");
  set("D14", obra?.cidade || obra?.cliente || "");
  set("G14", obra?.uf || "");
  set("I14", obra?.cep || "");
  set("D15", obra?.telefone || "");
  set("G15", obra?.contato || "");

  // ===== Fornecedor (bloco DIREITO) =====
  set("M12", forn?.nome || "");
  set("M13", forn?.endereco || "");
  set("M14", forn?.cidade || "");
  set("O14", forn?.uf || "");
  set("M15", forn?.telefone || "");
  set("P15", forn?.contato || "");

  // ===== Dados de Faturamento (Talieng / empresa) =====
  set("D18", empresa.nome || "TALIENG");
  set("D19", empresa.razao_social || "");
  set("D20", empresa.cnpj || "");
  set(
    "D21",
    `${empresa.endereco || ""}${empresa.cidade ? " - " + empresa.cidade : ""}${empresa.uf ? "/" + empresa.uf : ""}`
  );
  set("D22", empresa.telefone || "");
  set("G22", empresa.contato || "");

  // ===== Itens (linhas 27..32 = preset; até 33 com fórmula no template) =====
  const PRESET_END = 32;
  const startRow = 27;
  itens.forEach((it, idx) => {
    const r = startRow + idx;
    ws.getCell(`B${r}`).value = idx + 1;
    ws.getCell(`C${r}`).value = Number(it.quantidade) || 0;
    ws.getCell(`D${r}`).value = it.unidade || "";
    ws.getCell(`E${r}`).value = it.descricao || "";
    ws.getCell(`P${r}`).value = Number(it.preco_unitario) || 0;
    ws.getCell(`Q${r}`).value = { formula: `C${r}*P${r}` } as any;
    ws.getCell(`P${r}`).numFmt = '"R$" #,##0.00';
    ws.getCell(`Q${r}`).numFmt = '"R$" #,##0.00';
  });

  // Subtotal: se ultrapassar o preset, expandimos o range
  const lastItemRow = startRow + Math.max(itens.length, 1) - 1;
  if (lastItemRow > PRESET_END) {
    ws.getCell("Q35").value = { formula: `SUM(Q${startRow}:Q${lastItemRow})` } as any;
  } else {
    ws.getCell("Q35").value = { formula: `SUM(Q${startRow}:Q${PRESET_END})` } as any;
  }

  // ===== Rodapé financeiro =====
  ws.getCell("Q36").value = Number(ordem.frete_valor) || 0;            // Frete
  ws.getCell("Q37").value = Number(ordem.ipi) || 0;                    // IPI
  ws.getCell("Q38").value = -(Number(ordem.desconto) || 0);            // Desconto (negativo)
  ws.getCell("Q39").value = { formula: "Q35+Q36+Q37+Q38" } as any;     // Total geral
  ["Q35", "Q36", "Q37", "Q38", "Q39"].forEach((a) => (ws.getCell(a).numFmt = '"R$" #,##0.00'));

  // CIF / FOB (marca X ao lado do label em C37/C38)
  set("B37", (ordem.frete_tipo || "CIF") === "CIF" ? "X" : "");
  set("B38", ordem.frete_tipo === "FOB" ? "X" : "");

  // Dados bancários
  set("G37", empresa.banco || ordem.banco || "");
  set("G38", empresa.agencia || ordem.agencia || "");
  set("G39", empresa.conta || ordem.conta || "");

  // Garantia
  set("K42", ordem.garantia_anos ?? "");

  // Forçar recálculo das fórmulas ao abrir
  (wb as any).calcProperties = { ...(wb as any).calcProperties, fullCalcOnLoad: true };

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `OC-${String(ordem.numero ?? "").padStart(2, "0")}.xlsx`);
}
