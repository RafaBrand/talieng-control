import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl, fmtDate } from "./format";
import { supabase } from "@/integrations/supabase/client";

const CONDICOES = [
  "1 - A cópia desta Ordem de Compra deverá ser assinada com o de acordo pelo fornecedor e pelo representante da TALIENG ENGENHARIA LTDA.",
  "2 - Horário das entregas: das 7:30 às 16:00 horas. Qualquer fornecimento fora deste horário, deverá ser comunicado antecipadamente ao Departamento de Compras.",
  "3 - Os fornecimentos em desacordo com esta O.C., serão recusados e colocados a disposição da fornecedora que deverá retirá-los em 24 horas. Nenhuma despesa será paga em razão da devolução.",
  "4 - Toda a documentação originária deste fornecimento deverá ser encaminhada ao LOCAL DE COBRANÇA com antecedência mínima de 15 (quinze) dias em relação ao vencimento. Caso contrário o fornecedor obriga-se a prorrogar o vencimento da mesma por mais 30 (trinta) dias.",
  "5 - Reservamo-nos o direito de cancelar esta Ordem de Compra total ou parcialmente, sempre que não sejam obedecidas as condições nela constantes, não procedendo qualquer cobrança que se faça, além dos débitos originados de entregas efetivamente realizadas, aceitas e nas condições do presente.",
  "6 - Serão rejeitas e devolvidas as mercadorias que: 6.1 - Não estiverem acompanhadas por Notas Fiscais, em consonância com as disposições legais vigentes. 6.2 - Não estiverem de pleno acordo com todas as especificações desta Ordem de Compra ou verificado em obra.",
  "7 - Sempre que as mercadorias apresentarem defeitos, somente contatados após o seu recebimento, o Fornecedor deverá substituí-los sem ônus, arcando também com as despesas de mão-de-obra da retirada e recolocação, cajo já estejam aplicados, abrangendo inclusive perdas e danos causados à obra.",
  "8 - Para pagamento de fornecimento de prestação de serviços (mão-de-obra), deverão ser apresentadas mensalmente as guias de recolhimento de INSS, FGTS, ISS, FOLHA e RECIBO DE PAGAMENTO DE SALÁRIO, relativo ao mês anterior ao das notas fiscais, juntamente com a Nota Fiscal. 8.1 - A Nota Fiscal de cobrança deverá estar de acordo conforme a lei nº 9711 de 20.11.98. O S. 100/03 INSS ou conforme a lei vigente a data de emissão deste Pedido.",
  "9 - É de inteira responsabilidade do Fornecedor a emissão e entrega correta de Notas Fiscais Fatura, bem como os prejuízos causados por extravio e/ou não recebimento das Notas Fiscais Fatura, entre outros, no prazo e local devido.",
  "10 - O fornecedor se compromete a encaminhar as notas fiscais diretamente ao setor de Gestão de Compras da contratante para conferência e posterior pagamento. No caso de emissão de notas fiscais por meio eletrônico estas deverão ser encaminhadas ao e-mail: financeiro@talieng.com. Todas as notas fiscais deverão conter obrigatoriamente o nº da Ordem de Compra e descrição dos produtos e/ou serviços.",
  "11 - O Fornecedor que não atender o procedimento descrito nos itens 9 e 10 incorrerá em multa contratual no importe de 20 % (vinte por cento) sobre o valor da Ordem de Compra além de responder pelos danos de ordem moral e material caso a Contratante venha a sofrer protesto de títulos emitidos de forma indevida.",
  "12 - Está ordem de compra não é válida para negociação de títulos contra terceiros. Todos os documentos fiscais de cobrança, deverão ser mantidos em carteira até sua quitação.",
  "13 - O não cumprimento do prazo de entrega dos serviços e ou materiais, estipulado na(s) Ordem(ns) de Compra, implicará no pagamento, pela CONTRATADA, de multa de 0,25% (vinte e cinco décimos por cento) sobre o valor total dos serviços e/ou materiais, por dia de atraso, salvo se o prazo for prorrogado pela CONTRATANTE, após a ocorrência do evento gerador do atraso, bem como em decorrência de caso fortuito ou força maior.",
  "14 - Será realizada a Retenção de 5%, na Medição Mensal dos Empreiteiros a Título de Garantia Contratual. A Liberação da Retenção será após o Aceite Técnico, Fiscal, Tributário e Trabalhista.",
];

export async function gerarPdfOrdem(ordemOrId: any) {
  // Aceita id (string) ou objeto
  let ordem: any = ordemOrId;
  if (typeof ordemOrId === "string") {
    const { data } = await supabase.from("ordens_compra")
      .select("*, fornecedores(*), obras(*)")
      .eq("id", ordemOrId).maybeSingle();
    ordem = data;
  }
  if (!ordem) return;

  const [{ data: cfg }, { data: itensRaw }, { data: comprador }] = await Promise.all([
    supabase.from("empresa_config").select("*").limit(1).maybeSingle(),
    supabase.from("ordem_itens").select("*").eq("ordem_id", ordem.id).order("ordem"),
    ordem.comprador_id ? supabase.from("profiles").select("nome").eq("user_id", ordem.comprador_id).maybeSingle() : Promise.resolve({ data: null }),
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
  const itens: any[] = itensRaw && itensRaw.length ? itensRaw : (
    ordem.preco_unitario ? [{ descricao: "—", quantidade: ordem.quantidade, unidade: "", preco_unitario: ordem.preco_unitario, total: ordem.total }] : []
  );

  const subtotal = itens.reduce((s, i) => s + Number(i.preco_unitario || 0) * Number(i.quantidade || 0), 0);
  const total = subtotal + Number(ordem.frete_valor || 0) + Number(ordem.ipi || 0) - Number(ordem.desconto || 0);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 8;
  let y = 8;

  // ========== HEADER ==========
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(empresa.nome || "TALIENG ENGENHARIA CIVIL", M, y + 4);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(empresa.endereco || "Rua Mal. Deodoro 2034", M, y + 9);
  doc.text(`${empresa.cidade || "Curitiba"}-${empresa.uf || "PR"}  CEP: ${empresa.cep || "80045-090"}`, M, y + 13);
  doc.setFont("helvetica", "bold");
  doc.text("Fone:", M, y + 17);
  doc.setFont("helvetica", "normal");
  doc.text(empresa.telefone || "(41) 3149-3446 / 99501-3902", M + 9, y + 17);
  doc.setFont("helvetica", "bold");
  doc.text("E-mail NFE:", M, y + 22);
  doc.setFont("helvetica", "normal");
  doc.text(empresa.email || "financeiro@talieng.com", M + 18, y + 22);
  doc.setFont("helvetica", "bold");
  doc.text("CNPJ:", M, y + 26);
  doc.setFont("helvetica", "normal");
  doc.text(empresa.cnpj || "37.589.783/0001-09", M + 9, y + 26);

  // logo central (texto se não houver)
  if (empresa.logo_url) {
    try { doc.addImage(empresa.logo_url, "PNG", W / 2 - 18, y, 36, 22); } catch { /* ignore */ }
  } else {
    doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(178, 34, 34);
    doc.text("TALIENG", W / 2, y + 12, { align: "center" });
    doc.setFontSize(7).setTextColor(120);
    doc.text("ENGENHARIA CIVIL", W / 2, y + 17, { align: "center" });
    doc.setTextColor(0);
  }

  // slogan + numero/data/comprador
  doc.setFont("helvetica", "italic").setFontSize(7);
  doc.text('"Criando soluções de Engenharia para ligar caminhos e expandir negócios"', W - M, y + 4, { align: "right" });
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("Número:", W - 60, y + 11);
  doc.text("Data:", W - 28, y + 11);
  doc.setFont("helvetica", "normal");
  doc.text(`OC ${String(ordem.numero).padStart(2, "0")}`, W - 47, y + 11);
  doc.text(fmtDate(ordem.data_emissao || ordem.created_at?.slice(0, 10)), W - 18, y + 11);
  doc.setFont("helvetica", "bold");
  doc.text("Comprador:", W - 60, y + 17);
  doc.setFont("helvetica", "normal");
  doc.text(comprador?.nome || "—", W - 42, y + 17);

  // título
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(178, 34, 34);
  doc.text("ORDEM DE COMPRA", W - M, y + 28, { align: "right" });
  doc.setTextColor(0);
  // linha vermelha
  doc.setDrawColor(178, 34, 34).setLineWidth(0.5);
  doc.line(M, y + 31, W - M, y + 31);
  doc.setDrawColor(0).setLineWidth(0.2);
  y += 33;

  // ========== LOCAL DE ENTREGA / FORNECEDOR ==========
  const colW = (W - M * 2 - 4) / 2;
  const blockH = 32;
  const drawBlock = (x: number, title: string, lines: [string, string][]) => {
    doc.setDrawColor(150);
    doc.rect(x, y, colW, blockH);
    doc.setFillColor(245,245,245);
    doc.rect(x, y, colW, 5, "F");
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text(title, x + 2, y + 3.5);
    doc.setFont("helvetica", "normal").setFontSize(7.5);
    let yy = y + 9;
    lines.forEach(([k, v]) => {
      doc.setFont("helvetica", "bold");
      doc.text(k, x + 2, yy);
      doc.setFont("helvetica", "normal");
      doc.text(v || "", x + 22, yy);
      yy += 4.5;
    });
  };
  drawBlock(M, "Local de Entrega:", [
    ["Nome:", obra?.nome || ""],
    ["Endereço:", obra?.endereco || ""],
    ["Cidade:", obra?.cliente || ""],
    ["UF:", ""],
    ["Telefone:", ""],
  ]);
  drawBlock(M + colW + 4, "Fornecedor:", [
    ["Nome:", forn?.nome || ""],
    ["Endereço:", forn?.endereco || ""],
    ["Cidade:", forn?.cidade || ""],
    ["UF:", forn?.uf || ""],
    ["Telefone:", forn?.telefone || ""],
    ["Contato:", forn?.contato || ""],
  ]);
  y += blockH + 2;

  // ========== FATURAMENTO ==========
  doc.setDrawColor(150);
  doc.rect(M, y, W - M * 2, 22);
  doc.setFillColor(245,245,245);
  doc.rect(M, y, W - M * 2, 5, "F");
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("Dados de Faturamento:", M + 2, y + 3.5);
  doc.setFontSize(7.5);
  doc.text("Nome:", M + 2, y + 9.5);
  doc.text("Razão Social:", M + 2, y + 13.5);
  doc.text("CNPJ:", M + 2, y + 17.5);
  doc.text("Endereço:", M + 100, y + 9.5);
  doc.text("Telefone:", M + 100, y + 13.5);
  doc.text("Contato:", M + 100, y + 17.5);
  doc.setFont("helvetica", "normal");
  doc.text(empresa.nome || "TALIENG", M + 22, y + 9.5);
  doc.text(empresa.razao_social || "TALIENG ENGENHARIA LTDA", M + 22, y + 13.5);
  doc.text(empresa.cnpj || "37.589.783/0001-09", M + 22, y + 17.5);
  doc.text(`${empresa.endereco || ""} - ${empresa.cidade || ""}/${empresa.uf || ""}`, M + 118, y + 9.5);
  doc.text(empresa.telefone || "", M + 118, y + 13.5);
  doc.text(empresa.contato || "", M + 118, y + 17.5);
  y += 24;

  // ========== TABELA ITENS ==========
  autoTable(doc, {
    startY: y,
    head: [["Item", "Qtde", "Unidade", "Descrição", "UNITÁRIO", "TOTAL"]],
    body: itens.length ? itens.map((it, i) => [
      String(i + 1), String(it.quantidade || ""), it.unidade || "",
      it.descricao || "", brl(it.preco_unitario), brl(Number(it.preco_unitario || 0) * Number(it.quantidade || 0)),
    ]) : [["1", "", "", "—", "R$ —", "R$ —"]],
    theme: "grid",
    headStyles: { fillColor: [240, 240, 240], textColor: 0, fontSize: 8, halign: "center" },
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 16, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: "auto" as any },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 26, halign: "right" },
    },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // ========== FRETE / PAGAMENTO / TOTAIS ==========
  const lowH = 38;
  const cifFobX = M;
  const cifFobW = 30;
  const detalheX = cifFobX + cifFobW + 1;
  const detalheW = 60;
  const formaX = detalheX + detalheW + 1;
  const formaW = 50;
  const totaisX = formaX + formaW + 1;
  const totaisW = W - M - totaisX;

  // FRETE box
  doc.setDrawColor(150);
  doc.rect(cifFobX, y, cifFobW, lowH);
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("FRETE:", cifFobX + cifFobW / 2, y + 4, { align: "center" });
  // checkboxes
  doc.rect(cifFobX + 4, y + 8, 3, 3);
  if ((ordem.frete_tipo || "CIF") === "CIF") doc.text("X", cifFobX + 4.5, y + 10.5);
  doc.text("CIF", cifFobX + 9, y + 10.7);
  doc.rect(cifFobX + 4, y + 14, 3, 3);
  if (ordem.frete_tipo === "FOB") doc.text("X", cifFobX + 4.5, y + 16.5);
  doc.text("FOB", cifFobX + 9, y + 16.7);

  // DETALHE PAGAMENTO
  doc.rect(detalheX, y, detalheW, lowH);
  doc.text("DETALHE SOBRE O PAGAMENTO:", detalheX + detalheW / 2, y + 4, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(7.5);
  doc.text("BANCO", detalheX + 2, y + 11);
  doc.text(empresa.banco || ordem.banco || "", detalheX + 18, y + 11);
  doc.text("AGENCIA", detalheX + 2, y + 17);
  doc.text(empresa.agencia || ordem.agencia || "", detalheX + 18, y + 17);
  doc.text("Conta nº", detalheX + 2, y + 23);
  doc.text(empresa.conta || ordem.conta || "", detalheX + 18, y + 23);

  // FORMA PAGTO + CONDICOES ENTREGA
  doc.rect(formaX, y, formaW, lowH / 2);
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("FORMA DE PAGAMENTO:", formaX + formaW / 2, y + 4, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(7);
  const fpLines = doc.splitTextToSize(ordem.forma_pagamento || ordem.condicao_pagamento || "—", formaW - 4);
  doc.text(fpLines, formaX + 2, y + 9);
  doc.rect(formaX, y + lowH / 2, formaW, lowH / 2);
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("CONDIÇÕES DE ENTREGA:", formaX + formaW / 2, y + lowH / 2 + 4, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(7);
  const ceLines = doc.splitTextToSize(ordem.condicoes_entrega || "—", formaW - 4);
  doc.text(ceLines, formaX + 2, y + lowH / 2 + 9);

  // TOTAIS
  const rowH = lowH / 5;
  const labelX = totaisX;
  const valX = totaisX + totaisW * 0.55;
  const rows: [string, string][] = [
    ["Subtotal", brl(subtotal)],
    ["Frete", ordem.frete_valor ? brl(ordem.frete_valor) : ""],
    ["I.P.I.", ordem.ipi ? brl(ordem.ipi) : ""],
    ["Desconto", ordem.desconto ? brl(ordem.desconto) : ""],
    ["TOTAL", brl(total)],
  ];
  rows.forEach(([k, v], i) => {
    doc.rect(labelX, y + i * rowH, totaisW * 0.55, rowH);
    doc.rect(labelX + totaisW * 0.55, y + i * rowH, totaisW * 0.45, rowH);
    doc.setFont("helvetica", k === "TOTAL" ? "bold" : "normal").setFontSize(8);
    doc.text(k, labelX + 2, y + i * rowH + rowH / 2 + 1);
    doc.text(v, labelX + totaisW - 2, y + i * rowH + rowH / 2 + 1, { align: "right" });
  });
  y += lowH + 2;

  // CONTRATO/CEI/GARANTIA linha
  const cH = 8;
  doc.rect(M, y, 60, cH);
  doc.setFont("helvetica", "bold").setFontSize(7.5);
  doc.text("CONTRATO DE EMPREITEIRO:", M + 2, y + 3);
  doc.setFont("helvetica", "normal");
  doc.text(ordem.contrato_empreiteiro || "", M + 2, y + 6.5);
  doc.rect(M + 61, y, 60, cH);
  doc.setFont("helvetica", "bold");
  doc.text("C.E.I. DA OBRA:", M + 63, y + 3);
  doc.setFont("helvetica", "normal");
  doc.text(ordem.cei_obra || "", M + 63, y + 6.5);
  doc.rect(M + 122, y, W - M - (M + 122), cH);
  doc.setFont("helvetica", "bold");
  doc.text("Garantia:", M + 124, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`${ordem.garantia_anos ?? "____"}  Ano`, M + 140, y + 5);
  y += cH + 2;

  // OBSERVAÇÃO em destaque
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("OBSERVAÇÃO:", M, y + 3);
  doc.text("ESTA ORDEM DE COMPRA NÃO É DOCUMENTO VÁLIDO PARA NEGOCIAÇÃO DE TÍTULOS CONTRA TERCEIROS", M + 24, y + 3);
  y += 5;
  if (ordem.observacao) {
    doc.setFont("helvetica", "normal").setFontSize(7);
    const ol = doc.splitTextToSize(ordem.observacao, W - M * 2);
    doc.text(ol, M, y + 3); y += ol.length * 3.2 + 2;
  }
  doc.setFont("helvetica", "italic").setFontSize(7);
  doc.text("IMPOSTOS E FRETE INCLUSO NOS PREÇOS", M, y + 3);
  y += 6;

  // ========== CONDIÇÕES DE FORNECIMENTO ==========
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("CONDIÇÕES DE FORNECIMENTO:", M, y);
  y += 3;
  doc.setFont("helvetica", "normal").setFontSize(6.5);
  CONDICOES.forEach(c => {
    const lines = doc.splitTextToSize(c, W - M * 2);
    if (y + lines.length * 2.6 > 280) { doc.addPage(); y = 12; }
    doc.text(lines, M, y);
    y += lines.length * 2.6 + 0.6;
  });

  // ========== ASSINATURAS ==========
  if (y > 260) { doc.addPage(); y = 15; }
  y += 6;
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("DE ACORDO/APROVAÇÃO:", M, y);
  y += 8;
  const sigW = (W - M * 2) / 4;
  const labels = ["Departamento de Compras", "TALIENG ENGENHARIA LTDA", "TALIENG ENGENHARIA LTDA", "FORNECEDOR"];
  labels.forEach((l, i) => {
    const x = M + i * sigW;
    doc.line(x + 4, y, x + sigW - 4, y);
    doc.setFont("helvetica", "bold").setFontSize(7.5);
    doc.text(l, x + sigW / 2, y + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Data:    /    /    .", x + sigW / 2, y + 8, { align: "center" });
  });

  doc.save(`OC-${String(ordem.numero).padStart(2, "0")}.pdf`);
}
