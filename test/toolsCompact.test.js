import assert from 'node:assert/strict';
import test from 'node:test';

import { INTERCOMSWAP_TOOLS } from '../src/prompt/tools.js';
import { compactToolsForModel, toolsForModelProfile } from '../src/prompt/toolsCompact.js';

test('compactToolsForModel significantly reduces tool JSON size', () => {
  const full = JSON.stringify(INTERCOMSWAP_TOOLS);
  const compact = JSON.stringify(compactToolsForModel(INTERCOMSWAP_TOOLS));

  // This test is a guardrail for 32k-context models: the full schema bundle can
  // exceed context limits. We expect compaction to cut the payload meaningfully.
  assert.ok(compact.length < full.length, 'compact must be smaller than full');

  const ratio = compact.length / full.length;
  // Conservative: ensure we cut at least ~35% today. If this fails later, the
  // compaction likely regressed (or the full schemas got much smaller).
  assert.ok(ratio <= 0.65, `expected compact/full <= 0.65, got ${ratio.toFixed(3)}`);
});

test('toolsForModelProfile: minimal keeps only required fields', () => {
  const minimal = toolsForModelProfile(INTERCOMSWAP_TOOLS, { profile: 'minimal' });
  const target = minimal.find((t) => t?.function?.name === 'intercomswap_offer_post');
  assert.ok(target, 'intercomswap_offer_post should exist');
  const params = target.function.parameters;
  assert.equal(params.type, 'object');
  assert.ok(Array.isArray(params.required));
  assert.ok(params.required.includes('channels'));
  assert.ok(params.required.includes('name'));
  assert.ok(params.required.includes('offers'));
  assert.ok(params.properties && typeof params.properties === 'object');
  assert.deepEqual(Object.keys(params.properties).sort(), ['channels', 'name', 'offers']);
});

test('toolsForModelProfile: names_only is smallest and has empty parameter schema', () => {
  const full = JSON.stringify(INTERCOMSWAP_TOOLS);
  const namesOnlyTools = toolsForModelProfile(INTERCOMSWAP_TOOLS, { profile: 'names_only' });
  const namesOnly = JSON.stringify(namesOnlyTools);
  assert.ok(namesOnly.length < full.length, 'names_only should be smaller than full');
  const sample = namesOnlyTools.find((t) => t?.function?.name === 'intercomswap_sc_info');
  assert.ok(sample, 'sample tool should exist');
  assert.deepEqual(sample.function.parameters, {
    type: 'object',
    additionalProperties: true,
    properties: {},
  });
});
