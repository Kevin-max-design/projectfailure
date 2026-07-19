-- Create graph_nodes table
CREATE TABLE IF NOT EXISTS public.graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on entity_type and canonical_name
CREATE INDEX IF NOT EXISTS idx_graph_nodes_patient_type ON public.graph_nodes(patient_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_canonical_name ON public.graph_nodes(patient_id, canonical_name);

-- Create graph_edges table
CREATE TABLE IF NOT EXISTS public.graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    source_node_id UUID REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on edges source/target/type
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON public.graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON public.graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_patient_rel ON public.graph_edges(patient_id, relationship_type);

-- Create feedback_training_data table for continuous learning
CREATE TABLE IF NOT EXISTS public.feedback_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    original_ocr TEXT NOT NULL,
    original_extraction JSONB NOT NULL,
    corrected_extraction JSONB NOT NULL,
    confidence NUMERIC DEFAULT 1.0,
    reviewer_edits JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on feedback
CREATE INDEX IF NOT EXISTS idx_feedback_patient_doc ON public.feedback_training_data(patient_id, document_id);
