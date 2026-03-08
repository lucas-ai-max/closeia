import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../../../infrastructure/supabase/client.js';
import { logger } from '../../../shared/utils/logger.js';
import { openaiClient } from '../../../infrastructure/ai/openai-client.js';

export async function coachRoutes(fastify: FastifyInstance) {

    // POST /api/coaches/parse-script — upload PDF, extract text, organize with AI
    fastify.post('/parse-script', async (request: any, reply) => {
        const { role } = request.user;
        if (!['MANAGER', 'ADMIN'].includes(role)) {
            return reply.code(403).send({ error: 'Apenas gestores podem fazer upload de scripts' });
        }

        const file = await request.file();
        if (!file) {
            return reply.code(400).send({ error: 'Nenhum arquivo enviado' });
        }

        const allowedTypes = ['application/pdf'];
        if (!allowedTypes.includes(file.mimetype)) {
            return reply.code(400).send({ error: 'Apenas arquivos PDF são aceitos' });
        }

        try {
            const buffer = await file.toBuffer();
            logger.info({ size: buffer.length }, 'Coaches: PDF buffer received');

            // Extract text from PDF (pdf-parse v2 API)
            const { PDFParse } = await import('pdf-parse');
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            logger.info({ resultKeys: Object.keys(result), textLength: result.text?.length }, 'Coaches: PDF parsed');
            const rawText = result.text;

            if (!rawText || rawText.trim().length < 20) {
                return reply.code(400).send({ error: 'Não foi possível extrair texto do PDF. Verifique se o arquivo contém texto legível.' });
            }

            // Use GPT to organize the script
            const organizePrompt = `Você é um especialista em vendas. Recebeu o texto bruto de um script/roteiro de vendas extraído de um PDF.

Sua tarefa é organizar e estruturar esse conteúdo de forma clara e legível para que uma IA de coaching de vendas em tempo real consiga usar como referência durante uma ligação.

Regras:
- Mantenha TODO o conteúdo original, não remova informações
- Organize em seções claras com títulos (use ## para títulos)
- Identifique e separe: Etapas/Fases da venda, Perguntas-chave, Objeções e respostas, Argumentos de venda, Informações do produto
- Use bullet points para listas
- Corrija formatação quebrada (palavras cortadas, espaços extras do PDF)
- Mantenha em português brasileiro
- NÃO adicione conteúdo novo, apenas organize o existente

Texto bruto do PDF:
${rawText}`;

            const organized = await openaiClient.completeText(
                'Você organiza scripts de vendas extraídos de PDFs. Retorne apenas o texto organizado, sem comentários adicionais.',
                organizePrompt
            );

            return { script_content: organized || rawText };
        } catch (err: any) {
            logger.error({ err }, 'Coaches: Failed to parse script PDF');
            return reply.code(500).send({ error: 'Falha ao processar o PDF' });
        }
    });

    // POST /api/coaches/parse-product — upload PDF, extract product info with AI
    fastify.post('/parse-product', async (request: any, reply) => {
        const { role } = request.user;
        if (!['MANAGER', 'ADMIN'].includes(role)) {
            return reply.code(403).send({ error: 'Apenas gestores podem fazer upload' });
        }

        const file = await request.file();
        if (!file) {
            return reply.code(400).send({ error: 'Nenhum arquivo enviado' });
        }

        if (file.mimetype !== 'application/pdf') {
            return reply.code(400).send({ error: 'Apenas arquivos PDF são aceitos' });
        }

        try {
            const buffer = await file.toBuffer();
            const { PDFParse: PDFParseProduct } = await import('pdf-parse');
            const parserProduct = new PDFParseProduct({ data: buffer });
            const resultProduct = await parserProduct.getText();
            const rawText = resultProduct.text;

            if (!rawText || rawText.trim().length < 20) {
                return reply.code(400).send({ error: 'Não foi possível extrair texto do PDF.' });
            }

            const organizePrompt = `Você é um especialista em vendas. Recebeu o texto bruto de um documento sobre um produto/serviço, extraído de um PDF.

Sua tarefa é organizar esse conteúdo de forma clara para que uma IA de coaching de vendas consiga usar como referência.

Organize em seções claras:
## Nome do Produto
## Descrição
## Diferenciais e Vantagens
## Informações de Preço/Planos
## Público-Alvo
## Outros detalhes relevantes

Regras:
- Mantenha TODO o conteúdo original, não remova informações
- Use bullet points para listas
- Corrija formatação quebrada do PDF
- Mantenha em português brasileiro
- NÃO adicione conteúdo novo

Texto bruto do PDF:
${rawText}`;

            const organized = await openaiClient.completeText(
                'Você organiza informações de produtos extraídas de PDFs. Retorne apenas o texto organizado.',
                organizePrompt
            );

            return { product_content: organized || rawText };
        } catch (err: any) {
            logger.error({ err }, 'Coaches: Failed to parse product PDF');
            return reply.code(500).send({ error: 'Falha ao processar o PDF' });
        }
    });

    // GET /api/coaches — list all coaches for the user's organization
    fastify.get('/', async (request: any, reply) => {
        const { organization_id } = request.user;
        logger.info({ organization_id, userId: request.user.id, role: request.user.role }, 'Coaches: listing');

        const { data, error } = await supabaseAdmin
            .from('coaches')
            .select('id, name, description, methodology, tone, intervention_level, is_active, is_default, product_name, script_content, created_at, updated_at')
            .eq('organization_id', organization_id)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error({ err: error }, 'Coaches: Failed to list');
            return reply.code(500).send({ error: 'Falha ao listar coaches' });
        }

        logger.info({ count: data?.length }, 'Coaches: result');
        return data;
    });

    // GET /api/coaches/:id — get a single coach with all details
    fastify.get('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const { organization_id } = request.user;

        const { data, error } = await supabaseAdmin
            .from('coaches')
            .select('*')
            .eq('id', id)
            .eq('organization_id', organization_id)
            .maybeSingle();

        if (error) {
            logger.error({ err: error }, 'Coaches: Failed to get');
            return reply.code(500).send({ error: 'Falha ao buscar coach' });
        }
        if (!data) {
            return reply.code(404).send({ error: 'Coach não encontrado' });
        }

        return data;
    });

    // POST /api/coaches — create a new coach (MANAGER only)
    fastify.post('/', async (request: any, reply) => {
        const { role, organization_id } = request.user;

        if (!['MANAGER', 'ADMIN'].includes(role)) {
            return reply.code(403).send({ error: 'Apenas gestores podem criar coaches' });
        }

        const body = request.body as any;

        // If setting as default, unset other defaults first
        if (body.is_default) {
            await supabaseAdmin
                .from('coaches')
                .update({ is_default: false })
                .eq('organization_id', organization_id)
                .eq('is_default', true);
        }

        const { data, error } = await supabaseAdmin
            .from('coaches')
            .insert({
                organization_id,
                name: body.name,
                description: body.description || null,
                persona: body.persona || null,
                methodology: body.methodology || null,
                tone: body.tone || 'CONSULTIVE',
                intervention_level: body.intervention_level || 'MEDIUM',
                product_name: body.product_name || null,
                product_description: body.product_description || null,
                product_differentials: body.product_differentials || null,
                product_pricing_info: body.product_pricing_info || null,
                product_target_audience: body.product_target_audience || null,
                script_name: body.script_name || null,
                script_steps: body.script_steps || [],
                script_objections: body.script_objections || [],
                script_content: body.script_content || null,
                is_active: body.is_active ?? true,
                is_default: body.is_default ?? false,
            })
            .select()
            .single();

        if (error) {
            logger.error({ err: error }, 'Coaches: Failed to create');
            return reply.code(500).send({ error: 'Falha ao criar coach' });
        }

        return reply.code(201).send(data);
    });

    // PUT /api/coaches/:id — update a coach (MANAGER only)
    fastify.put('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const { role, organization_id } = request.user;

        if (!['MANAGER', 'ADMIN'].includes(role)) {
            return reply.code(403).send({ error: 'Apenas gestores podem editar coaches' });
        }

        const body = request.body as any;

        // If setting as default, unset other defaults first
        if (body.is_default) {
            await supabaseAdmin
                .from('coaches')
                .update({ is_default: false })
                .eq('organization_id', organization_id)
                .eq('is_default', true)
                .neq('id', id);
        }

        const updatePayload: Record<string, any> = {};
        const allowedFields = [
            'name', 'description', 'persona', 'methodology', 'tone',
            'intervention_level', 'product_name', 'product_description',
            'product_differentials', 'product_pricing_info', 'product_target_audience',
            'script_name', 'script_steps', 'script_objections', 'script_content',
            'is_active', 'is_default',
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updatePayload[field] = body[field];
            }
        }

        const { data, error } = await supabaseAdmin
            .from('coaches')
            .update(updatePayload)
            .eq('id', id)
            .eq('organization_id', organization_id)
            .select()
            .single();

        if (error) {
            logger.error({ err: error }, 'Coaches: Failed to update');
            return reply.code(500).send({ error: 'Falha ao atualizar coach' });
        }

        return data;
    });

    // DELETE /api/coaches/:id — delete a coach (MANAGER only)
    fastify.delete('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };
        const { role, organization_id } = request.user;

        if (!['MANAGER', 'ADMIN'].includes(role)) {
            return reply.code(403).send({ error: 'Apenas gestores podem deletar coaches' });
        }

        const { error } = await supabaseAdmin
            .from('coaches')
            .delete()
            .eq('id', id)
            .eq('organization_id', organization_id);

        if (error) {
            logger.error({ err: error }, 'Coaches: Failed to delete');
            return reply.code(500).send({ error: 'Falha ao deletar coach' });
        }

        return { success: true };
    });
}
