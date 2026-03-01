-- Enable required extensions
-- Note: pgvector is enabled in Phase 2 via Supabase Dashboard (Database > Extensions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clients table
-- Stores qualified client profiles from the upstream pipeline
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company TEXT,
    role TEXT,
    email TEXT,
    phone TEXT,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    meeting_link TEXT,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Research summaries table
-- Stores the output of the async research pipeline (Phase 2)
CREATE TABLE research_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    raw_research JSONB DEFAULT '{}',
    summary_text TEXT,
    linkedin_data JSONB DEFAULT '{}',
    company_data JSONB DEFAULT '{}',
    competitor_data JSONB DEFAULT '{}',
    news_data JSONB DEFAULT '{}',
    embedding JSONB DEFAULT NULL,  -- Will migrate to VECTOR(1536) in Phase 2 after enabling pgvector
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Calls table
-- Tracks each sales call session
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transcript segments table (HOT TABLE — high write frequency during live calls)
-- Each row is a single utterance from the transcription service
CREATE TABLE transcript_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    speaker TEXT NOT NULL CHECK (speaker IN ('salesperson', 'client')),
    text TEXT NOT NULL,
    start_ms INTEGER,
    end_ms INTEGER,
    is_final BOOLEAN DEFAULT FALSE,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Post-call summaries table
-- Stores the output of the post-call synthesis agent (Phase 6)
CREATE TABLE post_call_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    summary_text TEXT,
    action_items JSONB DEFAULT '[]',
    improvement_suggestions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI suggestions table
-- Stores real-time suggestions generated during live calls (Phase 5)
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    trigger_text TEXT,
    suggestion_text TEXT NOT NULL,
    tools_used JSONB DEFAULT '[]',
    confidence FLOAT,
    timestamp_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_clients_meeting ON clients(meeting_date ASC, meeting_time ASC);
CREATE INDEX idx_research_client ON research_summaries(client_id);
CREATE INDEX idx_research_status ON research_summaries(status);
CREATE INDEX idx_calls_client ON calls(client_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_transcript_call ON transcript_segments(call_id);
CREATE INDEX idx_transcript_call_final ON transcript_segments(call_id) WHERE is_final = TRUE;
CREATE INDEX idx_postcall_call ON post_call_summaries(call_id);
CREATE INDEX idx_suggestions_call ON ai_suggestions(call_id);

-- Enable Supabase Realtime on the tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE transcript_segments;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_suggestions;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER research_updated_at BEFORE UPDATE ON research_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
