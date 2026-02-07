function tool(name, description, parameters) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters,
    },
  };
}

const emptyParams = { type: 'object', additionalProperties: false, properties: {} };

const channelParam = {
  type: 'string',
  minLength: 1,
  maxLength: 128,
  description: 'Sidechannel name (e.g. 0000intercomswapbtcusdt or swap:<id>)',
};

const base64Param = {
  type: 'string',
  minLength: 1,
  maxLength: 16384,
  description: 'Base64-encoded JSON payload',
};

const hex32Param = {
  type: 'string',
  minLength: 64,
  maxLength: 64,
  pattern: '^[0-9a-fA-F]{64}$',
};

const base58Param = {
  type: 'string',
  minLength: 32,
  maxLength: 64,
  pattern: '^[1-9A-HJ-NP-Za-km-z]+$',
};

const unixSecParam = { type: 'integer', minimum: 1, description: 'Unix seconds timestamp' };

const atomicAmountParam = {
  type: 'string',
  minLength: 1,
  maxLength: 64,
  pattern: '^[0-9]+$',
  description: 'Decimal string amount in smallest units (atomic)',
};

const satsParam = { type: 'integer', minimum: 1, maximum: 21_000_000 * 100_000_000, description: 'Satoshis' };

// NOTE: This is a first, safe “tool surface” for prompting.
// The executor (Phase 5B) must validate and *must not* allow arbitrary file paths or shell execution.
export const INTERCOMSWAP_TOOLS = [
  // SC-Bridge safe RPCs (no CLI mirroring).
  tool('intercomswap_sc_info', 'Get peer info via SC-Bridge (safe fields only).', emptyParams),
  tool('intercomswap_sc_stats', 'Get SC-Bridge stats.', emptyParams),
  tool('intercomswap_sc_price_get', 'Get latest price snapshot from local price feature/oracle.', emptyParams),
  tool('intercomswap_sc_join', 'Join a sidechannel (invite/welcome optional).', {
    type: 'object',
    additionalProperties: false,
    properties: {
      channel: channelParam,
      invite_b64: { ...base64Param, description: 'Optional invite (base64 JSON).' },
      welcome_b64: { ...base64Param, description: 'Optional welcome (base64 JSON).' },
    },
    required: ['channel'],
  }),
  tool('intercomswap_sc_leave', 'Leave a sidechannel locally (channel hygiene).', {
    type: 'object',
    additionalProperties: false,
    properties: { channel: channelParam },
    required: ['channel'],
  }),
  tool('intercomswap_sc_open', 'Request/open a sidechannel via an entry channel (invite/welcome optional).', {
    type: 'object',
    additionalProperties: false,
    properties: {
      channel: channelParam,
      via: { ...channelParam, description: 'Entry/rendezvous channel to send the open request through.' },
      invite_b64: { ...base64Param, description: 'Optional invite (base64 JSON).' },
      welcome_b64: { ...base64Param, description: 'Optional welcome (base64 JSON).' },
    },
    required: ['channel', 'via'],
  }),
  tool('intercomswap_sc_send_text', 'Send a plain text message to a channel.', {
    type: 'object',
    additionalProperties: false,
    properties: {
      channel: channelParam,
      text: { type: 'string', minLength: 1, maxLength: 2000 },
    },
    required: ['channel', 'text'],
  }),
  tool('intercomswap_sc_send_json', 'Send a JSON message to a channel (structured payload).', {
    type: 'object',
    additionalProperties: false,
    properties: {
      channel: channelParam,
      json: { type: 'object' },
    },
    required: ['channel', 'json'],
  }),

  // RFQ / swap envelope helpers (Phase 5B executor will translate to swapctl+sign safely).
  tool('intercomswap_rfq_post', 'Post a signed RFQ envelope into an RFQ rendezvous channel.', {
    type: 'object',
    additionalProperties: false,
    properties: {
      channel: channelParam,
      trade_id: { type: 'string', minLength: 1, maxLength: 128 },
      btc_sats: satsParam,
      usdt_amount: atomicAmountParam,
      valid_until_unix: { ...unixSecParam, description: 'Optional expiry for the RFQ (unix seconds).' },
    },
    required: ['channel', 'trade_id', 'btc_sats', 'usdt_amount'],
  }),
  tool('intercomswap_quote_post', 'Post a signed QUOTE envelope into an RFQ channel (references an RFQ id).', {
    type: 'object',
    additionalProperties: false,
    properties: {
      channel: channelParam,
      trade_id: { type: 'string', minLength: 1, maxLength: 128 },
      rfq_id: hex32Param,
      btc_sats: satsParam,
      usdt_amount: atomicAmountParam,
      valid_until_unix: unixSecParam,
    },
    required: ['channel', 'trade_id', 'rfq_id', 'btc_sats', 'usdt_amount', 'valid_until_unix'],
  }),
  tool('intercomswap_quote_accept', 'Post a signed QUOTE_ACCEPT envelope into the RFQ channel (accept a quote).', {
    type: 'object',
    additionalProperties: false,
    properties: {
      channel: channelParam,
      quote_envelope: { type: 'object', description: 'Full signed quote envelope received from the network.' },
    },
    required: ['channel', 'quote_envelope'],
  }),
  tool(
    'intercomswap_swap_invite_from_accept',
    'Maker: generate welcome+invite and post SWAP_INVITE into the RFQ channel, based on an accepted quote.',
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        channel: channelParam,
        accept_envelope: { type: 'object', description: 'Full signed QUOTE_ACCEPT envelope received from the network.' },
        swap_channel: { ...channelParam, description: 'Optional explicit swap:<id> channel name. If omitted, derived.' },
        welcome_text: { type: 'string', minLength: 1, maxLength: 500 },
        ttl_sec: { type: 'integer', minimum: 30, maximum: 60 * 60 * 24 * 7 },
      },
      required: ['channel', 'accept_envelope', 'welcome_text'],
    }
  ),
  tool('intercomswap_join_from_swap_invite', 'Taker: join swap:<id> channel using SWAP_INVITE envelope.', {
    type: 'object',
    additionalProperties: false,
    properties: {
      swap_invite_envelope: { type: 'object', description: 'Full signed SWAP_INVITE envelope received from maker.' },
    },
    required: ['swap_invite_envelope'],
  }),

  tool('intercomswap_terms_post', 'Maker: post signed TERMS envelope inside swap:<id>.', {
    type: 'object',
    additionalProperties: false,
    properties: {
      channel: channelParam,
      trade_id: { type: 'string', minLength: 1, maxLength: 128 },
      btc_sats: satsParam,
      usdt_amount: atomicAmountParam,
      sol_mint: base58Param,
      sol_recipient: base58Param,
      sol_refund: base58Param,
      sol_refund_after_unix: unixSecParam,
      ln_receiver_peer: hex32Param,
      ln_payer_peer: hex32Param,
      platform_fee_bps: { type: 'integer', minimum: 0, maximum: 500 },
      trade_fee_bps: { type: 'integer', minimum: 0, maximum: 1000 },
      trade_fee_collector: base58Param,
      platform_fee_collector: { ...base58Param, description: 'Optional override, else use program config fee collector.' },
      terms_valid_until_unix: { ...unixSecParam, description: 'Optional expiry for terms acceptance.' },
    },
    required: [
      'channel',
      'trade_id',
      'btc_sats',
      'usdt_amount',
      'sol_mint',
      'sol_recipient',
      'sol_refund',
      'sol_refund_after_unix',
      'ln_receiver_peer',
      'ln_payer_peer',
      'platform_fee_bps',
      'trade_fee_bps',
      'trade_fee_collector',
    ],
  }),
  tool('intercomswap_terms_accept', 'Taker: post signed ACCEPT inside swap:<id> referencing the terms hash.', {
    type: 'object',
    additionalProperties: false,
    properties: {
      channel: channelParam,
      trade_id: { type: 'string', minLength: 1, maxLength: 128 },
      terms_hash_hex: { type: 'string', minLength: 64, maxLength: 64, pattern: '^[0-9a-fA-F]{64}$' },
    },
    required: ['channel', 'trade_id', 'terms_hash_hex'],
  }),
];

