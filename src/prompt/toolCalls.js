function safeJsonParse(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { ok: false, value: null, error: 'empty' };
  try {
    return { ok: true, value: JSON.parse(raw), error: null };
  } catch (err) {
    return { ok: false, value: null, error: err?.message ?? String(err) };
  }
}

function normalizeToolCallsOpenAI(message) {
  const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
  return calls
    .filter((c) => c && c.type === 'function' && c.function && typeof c.function.name === 'string')
    .map((c) => {
      const argsRaw = c.function.arguments ?? '';
      const parsed = safeJsonParse(argsRaw);
      return {
        id: typeof c.id === 'string' ? c.id : '',
        name: c.function.name,
        arguments: parsed.ok ? parsed.value : null,
        argumentsRaw: String(argsRaw ?? ''),
        parseError: parsed.ok ? null : parsed.error,
      };
    });
}

function normalizeFunctionCallLegacy(message) {
  const fc = message?.function_call;
  if (!fc || typeof fc.name !== 'string') return [];
  const parsed = safeJsonParse(fc.arguments ?? '');
  return [
    {
      id: '',
      name: fc.name,
      arguments: parsed.ok ? parsed.value : null,
      argumentsRaw: String(fc.arguments ?? ''),
      parseError: parsed.ok ? null : parsed.error,
    },
  ];
}

// Some OpenAI-compatible servers return tool calls at the top-level "tool_calls".
function normalizeToolCallsTopLevel(resp) {
  const calls = Array.isArray(resp?.tool_calls) ? resp.tool_calls : [];
  return calls
    .filter((c) => c && c.type === 'function' && c.function && typeof c.function.name === 'string')
    .map((c) => {
      const argsRaw = c.function.arguments ?? '';
      const parsed = safeJsonParse(argsRaw);
      return {
        id: typeof c.id === 'string' ? c.id : '',
        name: c.function.name,
        arguments: parsed.ok ? parsed.value : null,
        argumentsRaw: String(argsRaw ?? ''),
        parseError: parsed.ok ? null : parsed.error,
      };
    });
}

export function extractToolCallsFromChatCompletion(resp) {
  const choice = resp?.choices?.[0];
  const message = choice?.message ?? null;

  // 1) Current OpenAI tool_calls.
  const tc = normalizeToolCallsOpenAI(message);
  if (tc.length) return tc;

  // 2) Legacy single function_call.
  const fc = normalizeFunctionCallLegacy(message);
  if (fc.length) return fc;

  // 3) Provider quirks: tool_calls at top-level.
  const top = normalizeToolCallsTopLevel(resp);
  if (top.length) return top;

  return [];
}

