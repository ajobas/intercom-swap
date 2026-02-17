function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

// The full tool JSON schemas are great for validation but extremely expensive
// in LLM context. To make 32k-context models usable, we strip non-essential
// schema fields (descriptions, regexes, etc.) before sending to the model.
//
// The executor/validators still run against the full schema server-side.
function compactJsonSchema(schema, { keepDescriptions = false } = {}) {
  if (Array.isArray(schema)) return schema.map((v) => compactJsonSchema(v, { keepDescriptions }));
  if (!isObject(schema)) return schema;

  const out = {};

  // Keep a minimal, still-informative subset of JSON Schema keys.
  const keepScalarKeys = [
    'type',
    'const',
    'enum',
    'default',
    // Object/array constraints that help the model produce valid shapes.
    'additionalProperties',
    'minItems',
    'maxItems',
    'minProperties',
    'maxProperties',
    // Numeric bounds can matter for fees/amounts, but are cheap compared to regexes.
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
  ];
  for (const k of keepScalarKeys) {
    if (k in schema) out[k] = schema[k];
  }

  // Avoid carrying huge regex patterns and verbose descriptions/titles unless explicitly requested.
  if (keepDescriptions && typeof schema.description === 'string') out.description = schema.description;

  if (Array.isArray(schema.required)) out.required = schema.required;

  if (schema.items !== undefined) out.items = compactJsonSchema(schema.items, { keepDescriptions });

  if (isObject(schema.properties)) {
    const propsOut = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      propsOut[k] = compactJsonSchema(v, { keepDescriptions });
    }
    out.properties = propsOut;
  }

  for (const k of ['oneOf', 'anyOf', 'allOf']) {
    if (Array.isArray(schema[k])) out[k] = schema[k].map((v) => compactJsonSchema(v, { keepDescriptions }));
  }

  return out;
}

export function compactToolsForModel(
  tools,
  { keepToolDescriptions = true, keepSchemaDescriptions = false } = {}
) {
  const list = Array.isArray(tools) ? tools : [];
  const out = [];
  for (const t of list) {
    if (!t || t.type !== 'function' || !isObject(t.function) || typeof t.function.name !== 'string') continue;

    const fn = t.function;
    const toolOut = {
      type: 'function',
      function: {
        name: fn.name,
        // Keep tool-level descriptions by default; they are much smaller than per-field descriptions
        // and help the model choose between similar tools.
        ...(keepToolDescriptions && typeof fn.description === 'string' && fn.description.trim()
          ? { description: fn.description.trim() }
          : {}),
        parameters: compactJsonSchema(fn.parameters, { keepDescriptions: keepSchemaDescriptions }),
      },
    };
    out.push(toolOut);
  }
  return out;
}

function minimalJsonSchema(schema, { keepDescriptions = false } = {}) {
  if (Array.isArray(schema)) return schema.map((v) => minimalJsonSchema(v, { keepDescriptions }));
  if (!isObject(schema)) return schema;

  const out = {};
  const t = typeof schema.type === 'string' ? schema.type : null;
  if (t) out.type = t;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) out.enum = schema.enum;
  if ('const' in schema) out.const = schema.const;
  if (keepDescriptions && typeof schema.description === 'string') out.description = schema.description;

  if (t === 'object' || isObject(schema.properties) || Array.isArray(schema.required)) {
    out.type = 'object';
    out.additionalProperties = schema.additionalProperties === true;

    const req = Array.isArray(schema.required) ? schema.required.filter((k) => typeof k === 'string' && k.trim()) : [];
    if (req.length > 0) out.required = req;

    const propsOut = {};
    const props = isObject(schema.properties) ? schema.properties : {};
    for (const key of req) {
      if (!(key in props)) continue;
      propsOut[key] = minimalJsonSchema(props[key], { keepDescriptions });
    }
    if (Object.keys(propsOut).length > 0) out.properties = propsOut;
    return out;
  }

  if (t === 'array' || schema.items !== undefined) {
    out.type = 'array';
    if (schema.items !== undefined) out.items = minimalJsonSchema(schema.items, { keepDescriptions });
    return out;
  }

  return out;
}

function namesOnlyToolsForModel(
  tools,
  { keepToolDescriptions = false } = {}
) {
  const list = Array.isArray(tools) ? tools : [];
  const out = [];
  for (const t of list) {
    if (!t || t.type !== 'function' || !isObject(t.function) || typeof t.function.name !== 'string') continue;
    const fn = t.function;
    out.push({
      type: 'function',
      function: {
        name: fn.name,
        ...(keepToolDescriptions && typeof fn.description === 'string' && fn.description.trim()
          ? { description: fn.description.trim() }
          : {}),
        parameters: { type: 'object', additionalProperties: true, properties: {} },
      },
    });
  }
  return out;
}

export function minimalToolsForModel(
  tools,
  { keepToolDescriptions = true, keepSchemaDescriptions = false } = {}
) {
  const list = Array.isArray(tools) ? tools : [];
  const out = [];
  for (const t of list) {
    if (!t || t.type !== 'function' || !isObject(t.function) || typeof t.function.name !== 'string') continue;
    const fn = t.function;
    out.push({
      type: 'function',
      function: {
        name: fn.name,
        ...(keepToolDescriptions && typeof fn.description === 'string' && fn.description.trim()
          ? { description: fn.description.trim() }
          : {}),
        parameters: minimalJsonSchema(fn.parameters, { keepDescriptions: keepSchemaDescriptions }),
      },
    });
  }
  return out;
}

export function normalizeToolSchemaProfile(value, { fallback = 'compact' } = {}) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'full' || raw === 'compact' || raw === 'minimal' || raw === 'names_only') return raw;
  return fallback;
}

export function toolsForModelProfile(
  tools,
  {
    profile = 'compact',
    keepToolDescriptions = true,
    keepSchemaDescriptions = false,
  } = {}
) {
  const normalized = normalizeToolSchemaProfile(profile, { fallback: 'compact' });
  if (normalized === 'full') return cloneJson(Array.isArray(tools) ? tools : []);
  if (normalized === 'minimal') {
    return minimalToolsForModel(tools, { keepToolDescriptions, keepSchemaDescriptions });
  }
  if (normalized === 'names_only') {
    return namesOnlyToolsForModel(tools, { keepToolDescriptions: false });
  }
  return compactToolsForModel(tools, { keepToolDescriptions, keepSchemaDescriptions });
}
