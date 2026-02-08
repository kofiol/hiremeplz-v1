# Prompt Versioning & Time Machine Debugging

Quick reference for the conversation tracking and prompt versioning system.

## Tables

### `prompt_versions`
Stores versioned prompt configurations. The active version is used at runtime; old versions are kept for auditing.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agent_type | enum | Which agent (`onboarding`, `dashboard_copilot`, etc.) |
| version | int | Auto-incrementing version number per agent |
| name | text | Human-readable name (e.g., "Conversational Agent v2") |
| instructions | text | The full system prompt |
| model | text | Model ID (e.g., `gpt-5-mini`) |
| model_settings | jsonb | Model config (`{ "reasoning": { "effort": "low" } }`) |
| is_active | boolean | Only one active version per agent_type + name pattern |
| created_at | timestamptz | When this version was created |

### `conversations`
One row per chat session. Links to the prompt version used.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| team_id | uuid | Team scope |
| user_id | uuid | Who started it |
| agent_type | enum | Which agent handled the conversation |
| status | text | `active` or `completed` |
| prompt_version_id | uuid (nullable) | FK to `prompt_versions` — which prompt was active |
| model | text (nullable) | Model used for this conversation |
| metadata | jsonb | Arbitrary metadata |
| started_at / finished_at | timestamptz | Lifecycle timestamps |

### `conversation_messages`
Every message in every conversation, in order.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| conversation_id | uuid | FK to `conversations` |
| role | text | `user`, `assistant`, `system`, or `tool` |
| content | text | The message text |
| tool_calls | jsonb | Tool call details (if any) |
| saved_fields | jsonb | Which profile fields were saved by this turn |
| tokens_used | int | Token count (if tracked) |
| model | text | Model used for this specific message |
| created_at | timestamptz | Message timestamp |

## How It Works

### At Runtime (route.ts)
1. `getActivePromptVersion("onboarding", "Conversational Agent")` fetches the active version
2. If found: uses its `instructions`, `model`, and `modelSettings` instead of hardcoded defaults
3. If not found: falls back to `CONVERSATIONAL_AGENT_INSTRUCTIONS` + `gpt-5-mini`
4. A new `conversation` row is created with `prompt_version_id` set
5. Every user and assistant message is saved to `conversation_messages`

### Creating a New Prompt Version
```sql
INSERT INTO prompt_versions (agent_type, name, instructions, model, model_settings, is_active)
VALUES (
  'onboarding',
  'Conversational Agent v2',
  'Your new prompt here...',
  'gpt-5-mini',
  '{"reasoning": {"effort": "low"}}',
  true
);

-- Deactivate old version
UPDATE prompt_versions
SET is_active = false
WHERE agent_type = 'onboarding'
  AND name ILIKE '%Conversational Agent%'
  AND is_active = true
  AND id != '<new-version-id>';
```

### A/B Testing
Insert two active versions with different names — the code matches on `ILIKE '%pattern%'`, so you can have `"Conversational Agent A"` and `"Conversational Agent B"` and route traffic.

## Time Machine Debugging

### Replay a conversation
```sql
-- Find recent conversations
SELECT c.id, c.status, c.model, c.started_at, pv.name as prompt_version
FROM conversations c
LEFT JOIN prompt_versions pv ON c.prompt_version_id = pv.id
WHERE c.agent_type = 'onboarding'
ORDER BY c.created_at DESC
LIMIT 10;

-- Read the full transcript
SELECT role, content, saved_fields, tool_calls, created_at
FROM conversation_messages
WHERE conversation_id = '<conversation-id>'
ORDER BY created_at;
```

### Compare across prompt versions
```sql
-- See which prompt version produced which conversations
SELECT
  pv.name,
  pv.version,
  pv.model,
  COUNT(c.id) as conversation_count,
  AVG(EXTRACT(EPOCH FROM (c.finished_at - c.started_at))) as avg_duration_sec
FROM conversations c
JOIN prompt_versions pv ON c.prompt_version_id = pv.id
WHERE c.agent_type = 'onboarding'
GROUP BY pv.id, pv.name, pv.version, pv.model
ORDER BY pv.version DESC;
```

### See what the agent saved per turn
```sql
SELECT role, content, saved_fields
FROM conversation_messages
WHERE conversation_id = '<id>'
  AND saved_fields IS NOT NULL
ORDER BY created_at;
```

### Debug a specific turn's tool calls
```sql
SELECT content, tool_calls, saved_fields, tokens_used
FROM conversation_messages
WHERE conversation_id = '<id>'
  AND role = 'assistant'
ORDER BY created_at;
```

## Code References

| File | What it does |
|------|-------------|
| `chat/conversation.server.ts` | `createConversation()`, `saveMessage()`, `completeConversation()`, `getActivePromptVersion()` |
| `chat/route.ts` | Calls `getActivePromptVersion()` at start, creates conversation, saves messages |
| `chat/agent.ts` | `CONVERSATIONAL_AGENT_INSTRUCTIONS` (hardcoded fallback), `createConversationalAgent()` |
| `chat/analysis.ts` | Uses `promptVersion.modelSettings` for analysis agent too |
