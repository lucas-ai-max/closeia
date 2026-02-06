export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            scripts: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    description: string | null
                    coach_personality: string
                    coach_tone: string
                    intervention_level: string
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    name: string
                    description?: string | null
                    coach_personality?: string
                    coach_tone?: string
                    intervention_level?: string
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    description?: string | null
                    coach_personality?: string
                    coach_tone?: string
                    intervention_level?: string
                    is_active?: boolean
                    created_at?: string
                }
            }
            script_steps: {
                Row: {
                    id: string
                    script_id: string
                    step_order: number
                    name: string
                    description: string | null
                    key_questions: string[] | null
                    transition_criteria: string | null
                    estimated_duration: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    script_id: string
                    step_order: number
                    name: string
                    description?: string | null
                    key_questions?: string[] | null
                    transition_criteria?: string | null
                    estimated_duration?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    script_id?: string
                    step_order?: number
                    name?: string
                    description?: string | null
                    key_questions?: string[] | null
                    transition_criteria?: string | null
                    estimated_duration?: number | null
                    created_at?: string
                }
            }
            objections: {
                Row: {
                    id: string
                    script_id: string
                    trigger_phrases: string[]
                    mental_trigger: string | null
                    suggested_response: string | null
                    coaching_tip: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    script_id: string
                    trigger_phrases: string[]
                    mental_trigger?: string | null
                    suggested_response?: string | null
                    coaching_tip?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    script_id?: string
                    trigger_phrases?: string[]
                    mental_trigger?: string | null
                    suggested_response?: string | null
                    coaching_tip?: string | null
                    created_at?: string
                }
            }
        }
    }
}
