import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { SolanaRpcPool } from '../src/solana/rpcPool.js';

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve(addr.port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

test('solana rpc pool: fails over across csv urls and pins last-known-good', async () => {
  const badServer = http.createServer((_req, res) => {
    res.statusCode = 503;
    res.setHeader('content-type', 'text/plain');
    res.end('unavailable');
  });

  const goodServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let j = null;
      try {
        j = JSON.parse(body);
      } catch (_e) {
        res.statusCode = 400;
        res.end('bad json');
        return;
      }

      if (j?.method === 'getLatestBlockhash') {
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: j.id,
          result: {
            context: { slot: 1 },
            value: {
              // Any base58-encoded 32-byte string is acceptable as a "blockhash".
              blockhash: '11111111111111111111111111111111',
              lastValidBlockHeight: 1,
            },
          },
        }));
        return;
      }

      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: j?.id ?? 1,
        error: { code: -32601, message: 'Method not found' },
      }));
    });
  });

  const badPort = await listen(badServer);
  const goodPort = await listen(goodServer);
  const badUrl = `http://127.0.0.1:${badPort}`;
  const goodUrl = `http://127.0.0.1:${goodPort}`;

  try {
    const pool = new SolanaRpcPool({
      rpcUrls: `${badUrl},${goodUrl}`,
      commitment: 'confirmed',
      timeoutMs: 500,
    });

    const used1 = await pool.call(async (connection, url) => {
      await connection.getLatestBlockhash('confirmed');
      return url;
    }, { label: 'ping1' });
    assert.equal(used1, goodUrl);
    assert.equal(pool._preferredIndex, 1);

    const used2 = await pool.call(async (connection, url) => {
      await connection.getLatestBlockhash('confirmed');
      return url;
    }, { label: 'ping2' });
    assert.equal(used2, goodUrl);
    assert.equal(pool._preferredIndex, 1);
  } finally {
    await close(badServer);
    await close(goodServer);
  }
});

test('solana rpc pool: errors if every endpoint fails', async () => {
  const badServer = http.createServer((_req, res) => {
    res.statusCode = 503;
    res.end('unavailable');
  });
  const port = await listen(badServer);
  const url = `http://127.0.0.1:${port}`;

  try {
    const pool = new SolanaRpcPool({ rpcUrls: url, commitment: 'confirmed', timeoutMs: 500 });
    await assert.rejects(
      () =>
        pool.call(async (connection) => {
          await connection.getLatestBlockhash('confirmed');
        }, { label: 'ping' }),
      /ping failed/
    );
  } finally {
    await close(badServer);
  }
});

