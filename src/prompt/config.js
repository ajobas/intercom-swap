import process from 'node:process';

function parseIntEnv(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const n = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatEnv(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const n = Number.parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : fallback;
}

function normalizeEmpty(value) {
  const s = String(value ?? '').trim();
  return s.length ? s : '';
}

function normalizeApiKey(value) {
  const s = normalizeEmpty(value);
  if (!s) return '';
  const lowered = s.toLowerCase();
  if (['not-required', 'none', 'null', 'undefined'].includes(lowered)) return '';
  return s;
}

export function loadLlmConfigFromEnv(env = process.env) {
  return {
    baseUrl: normalizeEmpty(env.INTERCOMSWAP_LLM_BASE_URL),
    apiKey: normalizeApiKey(env.INTERCOMSWAP_LLM_API_KEY),
    model: normalizeEmpty(env.INTERCOMSWAP_LLM_MODEL),

    maxTokens: parseIntEnv(env.INTERCOMSWAP_LLM_MAX_TOKENS, 0),
    temperature: parseFloatEnv(env.INTERCOMSWAP_LLM_TEMPERATURE, null),
    topP: parseFloatEnv(env.INTERCOMSWAP_LLM_TOP_P, null),

    // Non-OpenAI-standard params that some OpenAI-compatible servers accept.
    topK: parseIntEnv(env.INTERCOMSWAP_LLM_TOP_K, null),
    minP: parseFloatEnv(env.INTERCOMSWAP_LLM_MIN_P, null),
    repetitionPenalty: parseFloatEnv(env.INTERCOMSWAP_LLM_REPETITION_PENALTY, null),

    // Tool calling format. "tools" is the OpenAI current standard. Some servers only support "functions".
    toolFormat: normalizeEmpty(env.INTERCOMSWAP_LLM_TOOL_FORMAT) || 'tools', // tools|functions

    timeoutMs: parseIntEnv(env.INTERCOMSWAP_LLM_TIMEOUT_MS, 120_000),
  };
}

