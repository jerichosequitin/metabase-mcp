import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { afterEach, describe, expect, it } from 'vitest';
import { createMetabaseProtocolServer } from '../src/server.js';
import { SEARCH_MODELS } from '../src/handlers/searchModels.js';

type ConnectedServer = {
  client: Client;
  close: () => Promise<void>;
};

const activeConnections: ConnectedServer[] = [];

async function connectClient(mode: 'legacy' | { pin: '2026-07-28' }) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const handle = serveStdio(createMetabaseProtocolServer, {
    legacy: 'serve',
    transport: serverTransport,
  });
  const client = new Client(
    { name: 'metabase-mcp-test', version: '1.0.0' },
    { versionNegotiation: { mode } }
  );

  await client.connect(clientTransport);

  const connection = {
    client,
    close: async () => {
      await client.close();
      await handle.close();
    },
  };
  activeConnections.push(connection);

  return connection;
}

afterEach(async () => {
  await Promise.all(activeConnections.splice(0).map(connection => connection.close()));
});

describe('MCP protocol compatibility', () => {
  it('serves the 2026-07-28 protocol with discovery and cache hints', async () => {
    const { client } = await connectClient({ pin: '2026-07-28' });

    expect(client.getProtocolEra()).toBe('modern');
    expect(client.getNegotiatedProtocolVersion()).toBe('2026-07-28');
    expect(client.getDiscoverResult()?.supportedVersions).toContain('2026-07-28');

    const result = await client.listTools();

    expect(result.tools.map(tool => tool.name)).toEqual([
      'search',
      'retrieve',
      'list',
      'execute',
      'export',
      'clear_cache',
    ]);
    const searchTool = result.tools.find(tool => tool.name === 'search');
    const searchModels = searchTool?.inputSchema.properties?.models as {
      items?: { enum?: readonly string[] };
    };
    expect(searchModels.items?.enum).toEqual(SEARCH_MODELS);
    expect(result.ttlMs).toBe(86_400_000);
    expect(result.cacheScope).toBe('public');
  });

  it('continues to serve legacy initialize clients', async () => {
    const { client } = await connectClient('legacy');

    expect(client.getProtocolEra()).toBe('legacy');

    const tools = await client.listTools();
    const result = await client.callTool({
      name: 'clear_cache',
      arguments: { cache_type: 'all' },
    });

    expect(tools.tools).toHaveLength(6);
    expect(result.isError).not.toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text' });
  });
});
