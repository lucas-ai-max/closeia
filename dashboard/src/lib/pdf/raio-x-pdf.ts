import type { FlatAnalysis } from '@/components/call-raio-x-tabs'

// ─── Palette (muted for print, not neon) ─────────────────────
const COLORS = {
  primary: [194, 24, 91] as [number, number, number], // muted pink
  primaryLight: [252, 228, 236] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  textMuted: [110, 110, 110] as [number, number, number],
  border: [220, 220, 220] as [number, number, number],
  success: [34, 139, 34] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  sectionBg: [248, 248, 248] as [number, number, number],
}

const PAGE = {
  width: 210, // A4 mm
  height: 297,
  margin: 15,
  contentWidth: 180, // 210 - 2*15
}

// ─── Helpers ─────────────────────────────────────────────────

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function sanitize(s: string | undefined | null): string {
  if (!s) return ''
  // Strip emojis and non-Latin1 chars to avoid jsPDF font issues
  return String(s).replace(/[^\x00-\xff]/g, '').trim()
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function mapResult(result?: string): string {
  if (!result) return '—'
  const map: Record<string, string> = {
    CONVERTED: 'Venda realizada',
    FOLLOW_UP: 'Em negociacao',
    LOST: 'Venda nao realizada',
    UNKNOWN: 'A definir',
    'Venda realizada': 'Venda realizada',
    'Em negociação': 'Em negociacao',
    'Venda não realizada': 'Venda nao realizada',
    'A definir': 'A definir',
  }
  return map[result] || result
}

// ─── PDF builder ─────────────────────────────────────────────

interface DocContext {
  doc: any // jsPDF instance
  y: number
}

function addPageIfNeeded(ctx: DocContext, needed: number): void {
  if (ctx.y + needed > PAGE.height - 20) {
    ctx.doc.addPage()
    ctx.y = PAGE.margin
  }
}

function drawSectionHeader(ctx: DocContext, title: string): void {
  addPageIfNeeded(ctx, 15)
  const { doc } = ctx
  doc.setFillColor(...COLORS.primary)
  doc.rect(PAGE.margin, ctx.y, 3, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLORS.text)
  doc.text(sanitize(title), PAGE.margin + 6, ctx.y + 6)
  ctx.y += 12
}

function drawParagraph(ctx: DocContext, text: string, options?: { bold?: boolean; size?: number; color?: [number, number, number] }): void {
  const { doc } = ctx
  const size = options?.size ?? 10
  const color = options?.color ?? COLORS.text
  doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...color)
  const lines: string[] = doc.splitTextToSize(sanitize(text), PAGE.contentWidth)
  const lineHeight = size * 0.4
  for (const line of lines) {
    addPageIfNeeded(ctx, lineHeight + 2)
    doc.text(line, PAGE.margin, ctx.y)
    ctx.y += lineHeight + 1
  }
}

function drawBulletList(ctx: DocContext, items: string[] | undefined): void {
  if (!items || items.length === 0) {
    drawParagraph(ctx, 'Nao identificado.', { color: COLORS.textMuted, size: 9 })
    return
  }
  const { doc } = ctx
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.text)
  for (const item of items) {
    const clean = sanitize(item)
    if (!clean) continue
    const lines: string[] = doc.splitTextToSize(clean, PAGE.contentWidth - 6)
    for (let i = 0; i < lines.length; i++) {
      addPageIfNeeded(ctx, 6)
      if (i === 0) {
        doc.setFillColor(...COLORS.primary)
        doc.circle(PAGE.margin + 1.5, ctx.y - 1.5, 0.8, 'F')
      }
      doc.text(lines[i], PAGE.margin + 5, ctx.y)
      ctx.y += 5
    }
    ctx.y += 1
  }
}

function drawKeyValue(ctx: DocContext, label: string, value?: string): void {
  if (!value) return
  const { doc } = ctx
  addPageIfNeeded(ctx, 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...COLORS.textMuted)
  doc.text(sanitize(label) + ':', PAGE.margin, ctx.y)
  const labelWidth = doc.getTextWidth(sanitize(label) + ': ')
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  const lines: string[] = doc.splitTextToSize(sanitize(value), PAGE.contentWidth - labelWidth)
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      doc.text(lines[i], PAGE.margin + labelWidth, ctx.y)
    } else {
      ctx.y += 5
      addPageIfNeeded(ctx, 5)
      doc.text(lines[i], PAGE.margin + labelWidth, ctx.y)
    }
  }
  ctx.y += 6
}

function drawSpacer(ctx: DocContext, height = 4): void {
  ctx.y += height
}

function drawHeader(ctx: DocContext, data: FlatAnalysis): void {
  const { doc } = ctx

  // Brand strip
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, PAGE.width, 18, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('HelpCloser - Raio X da Chamada', PAGE.margin, 12)
  ctx.y = 28

  // Lead name (big)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...COLORS.text)
  doc.text(sanitize(data.lead_nome || 'Lead sem nome'), PAGE.margin, ctx.y)
  ctx.y += 8

  // Metadata row
  const metaLine = [
    data.lead_data_call ? `Data: ${formatDate(data.lead_data_call)}` : null,
    data.lead_duracao_segundos ? `Duracao: ${formatDuration(data.lead_duracao_segundos)}` : null,
    data.resultado ? `Resultado: ${mapResult(data.resultado)}` : null,
  ]
    .filter(Boolean)
    .join('  |  ')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.textMuted)
  doc.text(sanitize(metaLine), PAGE.margin, ctx.y)
  ctx.y += 10

  // Adherence bar
  if (typeof data.aderencia_percentual === 'number') {
    const pct = Math.max(0, Math.min(100, data.aderencia_percentual))
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.text)
    doc.text(`Aderencia ao script: ${pct}%`, PAGE.margin, ctx.y)
    ctx.y += 4
    // Bar background
    doc.setFillColor(...COLORS.border)
    doc.rect(PAGE.margin, ctx.y, PAGE.contentWidth, 3, 'F')
    // Filled bar
    const color: [number, number, number] =
      pct >= 70 ? COLORS.success : pct >= 40 ? COLORS.warning : COLORS.danger
    doc.setFillColor(...color)
    doc.rect(PAGE.margin, ctx.y, (PAGE.contentWidth * pct) / 100, 3, 'F')
    ctx.y += 8
  }

  // Termometro
  if (data.termometro_classificacao || data.termometro_justificativa) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.textMuted)
    doc.text(`Termometro: ${sanitize(data.termometro_classificacao || '—')}`, PAGE.margin, ctx.y)
    ctx.y += 5
    if (data.termometro_justificativa) {
      drawParagraph(ctx, data.termometro_justificativa, { size: 9, color: COLORS.textMuted })
    }
  }

  // Divider
  ctx.y += 3
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(PAGE.margin, ctx.y, PAGE.width - PAGE.margin, ctx.y)
  ctx.y += 8
}

function drawFooterOnAllPages(doc: any): void {
  const total = doc.getNumberOfPages()
  const generatedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.textMuted)
    const text = `Gerado em ${generatedAt}  |  Pagina ${i} de ${total}  |  HelpCloser`
    const textWidth = doc.getTextWidth(text)
    doc.text(text, (PAGE.width - textWidth) / 2, PAGE.height - 8)
  }
}

// ─── Main export ─────────────────────────────────────────────

export async function generateRaioXPdf(data: FlatAnalysis): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const ctx: DocContext = { doc, y: 0 }

  // ── HEADER ──
  drawHeader(ctx, data)

  // ── 1. PONTOS DE OURO ──
  drawSectionHeader(ctx, 'Pontos de Ouro')
  drawParagraph(ctx, 'Pontos fortes:', { bold: true, size: 10, color: COLORS.success })
  drawBulletList(ctx, data.pontos_acertos)
  drawSpacer(ctx)
  drawParagraph(ctx, 'Pontos a melhorar:', { bold: true, size: 10, color: COLORS.warning })
  drawBulletList(ctx, data.pontos_melhorias)
  drawSpacer(ctx, 6)

  // ── 2. PERFIL PSICOLOGICO ──
  drawSectionHeader(ctx, 'Perfil Psicologico e Comportamental')
  drawKeyValue(ctx, 'Estado emocional', data.perfil_estado_emocional)
  drawKeyValue(ctx, 'Estilo de decisao', data.perfil_estilo_decisao)
  drawKeyValue(ctx, 'Consciencia do problema', data.perfil_consciencia_problema)
  drawKeyValue(ctx, 'Abertura a mudanca', data.perfil_abertura_mudanca)
  if (data.perfil_crencas_limitantes && data.perfil_crencas_limitantes.length > 0) {
    drawParagraph(ctx, 'Crencas limitantes:', { bold: true, size: 10 })
    drawBulletList(ctx, data.perfil_crencas_limitantes)
  }
  if (data.perfil_vocabulario_relevante && data.perfil_vocabulario_relevante.length > 0) {
    drawParagraph(ctx, 'Vocabulario relevante:', { bold: true, size: 10 })
    drawBulletList(ctx, data.perfil_vocabulario_relevante)
  }
  drawSpacer(ctx, 6)

  // ── 3. IMPACTO FINANCEIRO ──
  drawSectionHeader(ctx, 'Impacto Financeiro da Dor')
  drawKeyValue(ctx, 'Perda mensal estimada', data.financeiro_perda_mensal)
  drawKeyValue(ctx, 'Perda anual estimada', data.financeiro_perda_anual)
  drawKeyValue(ctx, 'Cenario sem acao', data.financeiro_cenario_sem_acao)
  if (data.financeiro_custos_oportunidade && data.financeiro_custos_oportunidade.length > 0) {
    drawParagraph(ctx, 'Custos de oportunidade:', { bold: true, size: 10 })
    drawBulletList(ctx, data.financeiro_custos_oportunidade)
  }
  drawSpacer(ctx, 6)

  // ── 4. DORES ──
  drawSectionHeader(ctx, 'Problemas e Dores')
  if (data.dores_top3 && data.dores_top3.length > 0) {
    drawParagraph(ctx, 'Top 3 por impacto:', { bold: true, size: 10, color: COLORS.danger })
    drawBulletList(ctx, data.dores_top3)
    drawSpacer(ctx)
  }
  if (data.dores_operacionais && data.dores_operacionais.length > 0) {
    drawParagraph(ctx, 'Operacionais:', { bold: true, size: 10 })
    drawBulletList(ctx, data.dores_operacionais)
  }
  if (data.dores_estrategicas && data.dores_estrategicas.length > 0) {
    drawParagraph(ctx, 'Estrategicas:', { bold: true, size: 10 })
    drawBulletList(ctx, data.dores_estrategicas)
  }
  if (data.dores_financeiras && data.dores_financeiras.length > 0) {
    drawParagraph(ctx, 'Financeiras:', { bold: true, size: 10 })
    drawBulletList(ctx, data.dores_financeiras)
  }
  if (data.dores_emocionais && data.dores_emocionais.length > 0) {
    drawParagraph(ctx, 'Emocionais:', { bold: true, size: 10 })
    drawBulletList(ctx, data.dores_emocionais)
  }
  drawSpacer(ctx, 6)

  // ── 5. OPORTUNIDADES ──
  drawSectionHeader(ctx, 'Oportunidades')
  if (data.oportunidades_tangiveis && data.oportunidades_tangiveis.length > 0) {
    drawParagraph(ctx, 'Ganhos tangiveis:', { bold: true, size: 10 })
    drawBulletList(ctx, data.oportunidades_tangiveis)
  }
  if (data.oportunidades_intangiveis && data.oportunidades_intangiveis.length > 0) {
    drawParagraph(ctx, 'Ganhos intangiveis:', { bold: true, size: 10 })
    drawBulletList(ctx, data.oportunidades_intangiveis)
  }
  if (data.oportunidades_diferenciais && data.oportunidades_diferenciais.length > 0) {
    drawParagraph(ctx, 'Diferenciais relevantes:', { bold: true, size: 10 })
    drawBulletList(ctx, data.oportunidades_diferenciais)
  }
  if (data.oportunidades_alinhamento && data.oportunidades_alinhamento.length > 0) {
    drawParagraph(ctx, 'Alinhamento a prioridades:', { bold: true, size: 10 })
    drawBulletList(ctx, data.oportunidades_alinhamento)
  }
  drawSpacer(ctx, 6)

  // ── 6. OBJECOES ──
  drawSectionHeader(ctx, 'Objecoes e Resistencias')
  if (data.objecoes_verbalizadas && data.objecoes_verbalizadas.length > 0) {
    drawParagraph(ctx, 'Verbalizadas:', { bold: true, size: 10 })
    drawBulletList(ctx, data.objecoes_verbalizadas)
  }
  if (data.objecoes_implicitas && data.objecoes_implicitas.length > 0) {
    drawParagraph(ctx, 'Implicitas:', { bold: true, size: 10 })
    drawBulletList(ctx, data.objecoes_implicitas)
  }
  drawSpacer(ctx)
  drawKeyValue(ctx, 'Angulo financeiro', data.objecoes_angulo_financeiro)
  drawKeyValue(ctx, 'Angulo tecnico', data.objecoes_angulo_tecnico)
  drawKeyValue(ctx, 'Angulo politico', data.objecoes_angulo_politico)
  drawKeyValue(ctx, 'Angulo emocional', data.objecoes_angulo_emocional)

  // Neutralizacoes como tabela
  if (data.objecoes_neutralizacoes && data.objecoes_neutralizacoes.length > 0) {
    drawSpacer(ctx)
    drawParagraph(ctx, 'Neutralizacoes cirurgicas:', { bold: true, size: 10, color: COLORS.primary })
    const rows = data.objecoes_neutralizacoes.map(n => [
      sanitize(n.objecao || ''),
      sanitize(n.estrategia || ''),
      sanitize(n.frase_modelo || ''),
    ])
    autoTable(doc, {
      startY: ctx.y,
      head: [['Objecao', 'Estrategia', 'Frase modelo']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8, cellPadding: 2, textColor: COLORS.text },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 60 }, 2: { cellWidth: 70 } },
      margin: { left: PAGE.margin, right: PAGE.margin },
    })
    // Update y after autoTable
    ctx.y = (doc as any).lastAutoTable?.finalY + 6 || ctx.y + 20
  }
  drawSpacer(ctx, 6)

  // ── 7. GATILHOS MENTAIS ──
  drawSectionHeader(ctx, 'Gatilhos Mentais a Ativar')
  drawKeyValue(ctx, 'Autoridade', data.gatilho_autoridade)
  drawKeyValue(ctx, 'Prova social', data.gatilho_prova_social)
  drawKeyValue(ctx, 'Urgencia', data.gatilho_urgencia)
  drawKeyValue(ctx, 'Reciprocidade', data.gatilho_reciprocidade)
  drawKeyValue(ctx, 'Dor vs Prazer', data.gatilho_dor_vs_prazer)
  drawSpacer(ctx, 6)

  // ── 8. NAO DIZER ──
  drawSectionHeader(ctx, 'O que NAO dizer/fazer')
  if (data.nao_dizer_termos && data.nao_dizer_termos.length > 0) {
    drawParagraph(ctx, 'Termos-problema:', { bold: true, size: 10, color: COLORS.danger })
    drawBulletList(ctx, data.nao_dizer_termos)
  }
  if (data.nao_dizer_erros_fatais && data.nao_dizer_erros_fatais.length > 0) {
    drawParagraph(ctx, 'Erros fatais:', { bold: true, size: 10, color: COLORS.danger })
    drawBulletList(ctx, data.nao_dizer_erros_fatais)
  }
  if (data.nao_dizer_sensibilidades && data.nao_dizer_sensibilidades.length > 0) {
    drawParagraph(ctx, 'Sensibilidades:', { bold: true, size: 10, color: COLORS.warning })
    drawBulletList(ctx, data.nao_dizer_sensibilidades)
  }
  drawSpacer(ctx, 6)

  // ── 9. LINGUAGEM ──
  drawSectionHeader(ctx, 'Linguagem, Framing e Frases-Chave')
  if (data.linguagem_mirroring && data.linguagem_mirroring.length > 0) {
    drawParagraph(ctx, 'Mirroring:', { bold: true, size: 10 })
    drawBulletList(ctx, data.linguagem_mirroring)
  }
  if (data.linguagem_palavras_usar && data.linguagem_palavras_usar.length > 0) {
    drawParagraph(ctx, 'Palavras a USAR:', { bold: true, size: 10, color: COLORS.success })
    drawBulletList(ctx, data.linguagem_palavras_usar)
  }
  if (data.linguagem_palavras_evitar && data.linguagem_palavras_evitar.length > 0) {
    drawParagraph(ctx, 'Palavras a EVITAR:', { bold: true, size: 10, color: COLORS.danger })
    drawBulletList(ctx, data.linguagem_palavras_evitar)
  }
  if (data.linguagem_ancoragens && data.linguagem_ancoragens.length > 0) {
    drawParagraph(ctx, 'Ancoragens:', { bold: true, size: 10 })
    drawBulletList(ctx, data.linguagem_ancoragens)
  }
  if (data.linguagem_frases_modelo && data.linguagem_frases_modelo.length > 0) {
    drawParagraph(ctx, 'Frases-modelo:', { bold: true, size: 10, color: COLORS.primary })
    drawBulletList(ctx, data.linguagem_frases_modelo)
  }

  // ── FOOTER ──
  drawFooterOnAllPages(doc)

  // ── SAVE ──
  const date = data.lead_data_call
    ? new Date(data.lead_data_call).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const filename = `raio-x-${slug(data.lead_nome || 'lead')}-${date}.pdf`
  doc.save(filename)
}
