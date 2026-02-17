import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadPromptSetupFromFile } from '../src/prompt/config.js';

function writeSetup(tmpDir, partial = {}) {
  const payload = {
    peer: { keypair: 'stores/test/db/keypair.json' },
    llm: {
      base_url: 'http://127.0.0.1:8000/v1',
      model: 'stub-model',
    },
    sc_bridge: {
      token: 'test-token',
    },
    ...partial,
  };
  const file = path.join(tmpDir, 'setup.json');
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

test('prompt config: defaults remain openai/default/compact', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intercomswap-config-'));
  const file = writeSetup(tmp);
  const cfg = loadPromptSetupFromFile({ configPath: file, cwd: tmp });
  assert.equal(cfg.llm.callStyle, 'openai');
  assert.equal(cfg.llm.promptProfile, 'default');
  assert.equal(cfg.llm.toolSchemaProfile, 'compact');
});

test('prompt config: functiongemma call_style gets functiongemma-friendly defaults', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intercomswap-config-'));
  const file = writeSetup(tmp, {
    llm: {
      base_url: 'http://127.0.0.1:8000/v1',
      model: 'functiongemma',
      call_style: 'functiongemma',
    },
  });
  const cfg = loadPromptSetupFromFile({ configPath: file, cwd: tmp });
  assert.equal(cfg.llm.callStyle, 'functiongemma');
  assert.equal(cfg.llm.promptProfile, 'functiongemma_minimal');
  assert.equal(cfg.llm.toolSchemaProfile, 'minimal');
});

test('prompt config: functiongemma model name auto-selects functiongemma defaults', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intercomswap-config-'));
  const file = writeSetup(tmp, {
    llm: {
      base_url: 'http://127.0.0.1:8000/v1',
      model: 'functiongemma-v3-turn1-nvfp4',
    },
  });
  const cfg = loadPromptSetupFromFile({ configPath: file, cwd: tmp });
  assert.equal(cfg.llm.callStyle, 'functiongemma');
  assert.equal(cfg.llm.promptProfile, 'functiongemma_minimal');
  assert.equal(cfg.llm.toolSchemaProfile, 'minimal');
});

test('prompt config: explicit openai call_style overrides functiongemma model name inference', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intercomswap-config-'));
  const file = writeSetup(tmp, {
    llm: {
      base_url: 'http://127.0.0.1:8000/v1',
      model: 'functiongemma-v3-turn1-nvfp4',
      call_style: 'openai',
    },
  });
  const cfg = loadPromptSetupFromFile({ configPath: file, cwd: tmp });
  assert.equal(cfg.llm.callStyle, 'openai');
  assert.equal(cfg.llm.promptProfile, 'default');
  assert.equal(cfg.llm.toolSchemaProfile, 'compact');
});

test('prompt config: explicit prompt/tool schema profile overrides are respected', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intercomswap-config-'));
  const file = writeSetup(tmp, {
    llm: {
      base_url: 'http://127.0.0.1:8000/v1',
      model: 'functiongemma',
      call_style: 'functiongemma',
      prompt_profile: 'default',
      tool_schema_profile: 'names_only',
    },
  });
  const cfg = loadPromptSetupFromFile({ configPath: file, cwd: tmp });
  assert.equal(cfg.llm.callStyle, 'functiongemma');
  assert.equal(cfg.llm.promptProfile, 'default');
  assert.equal(cfg.llm.toolSchemaProfile, 'names_only');
});

test('prompt config: legacy tools_compact=false maps to full when no new profile set', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intercomswap-config-'));
  const file = writeSetup(tmp, {
    llm: {
      base_url: 'http://127.0.0.1:8000/v1',
      model: 'stub',
      tools_compact: false,
    },
  });
  const cfg = loadPromptSetupFromFile({ configPath: file, cwd: tmp });
  assert.equal(cfg.llm.callStyle, 'openai');
  assert.equal(cfg.llm.toolSchemaProfile, 'full');
});
