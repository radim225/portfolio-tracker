import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools.js';
import { closePool } from '../lib/db/index.js';

const server = new Server(
  { name: 'investment-tracker', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

// List all tools.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: {
      type: 'object' as const,
      properties: Object.fromEntries(
        Object.entries((t.schema as { shape?: Record<string, unknown> }).shape ?? {}).map(
          ([k, v]) => [k, { type: 'string', description: (v as { description?: string }).description }],
        ),
      ),
    },
  })),
}));

// Handle tool calls.
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) {
    return { content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }], isError: true };
  }

  try {
    const args = tool.schema.parse(request.params.arguments ?? {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool.handler as (a: typeof args) => Promise<unknown>)(args as any);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

// Run.
const transport = new StdioServerTransport();
await server.connect(transport);

// Clean up pool when stdin closes.
process.stdin.on('close', async () => {
  await closePool();
  process.exit(0);
});
