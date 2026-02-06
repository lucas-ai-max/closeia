import { z } from "zod"

export const scriptSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    description: z.string().optional(),
    coach_personality: z.string().default("Strategic"),
    coach_tone: z.string().default("Here is a tip"),
    intervention_level: z.string().default("Medium"),
    is_active: z.boolean().default(true),
})

export type ScriptFormValues = z.infer<typeof scriptSchema>

export const stepSchema = z.object({
    name: z.string().min(3, "Nome da etapa é obrigatório"),
    description: z.string().optional(),
    step_order: z.number().int(),
    key_questions: z.array(z.string()).optional(),
    estimated_duration: z.number().optional(),
})

export const objectionSchema = z.object({
    trigger_phrases: z.array(z.string()).min(1, "Adicione pelo menos uma frase gatilho"),
    suggested_response: z.string().min(10, "Sugestão de resposta é obrigatória"),
    coaching_tip: z.string().optional(),
})
