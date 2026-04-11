#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { LambdaTestClient, type LTSession } from './api.js';

// ── Auth ──────────────────────────────────────────────────────────────────────
const username = process.env.LT_USERNAME;
const accessKey = process.env.LT_ACCESS_KEY;
if (!username || !accessKey) {
  process.stderr.write('Error: LT_USERNAME and LT_ACCESS_KEY environment variables are required\n');
  process.exit(1);
}
const client = new LambdaTestClient(username, accessKey);

// ── Input validation ──────────────────────────────────────────────────────────
function validateBuildId(id: unknown): string {
  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    throw new Error('build_id must be a numeric string (e.g. "19305815")');
  }
  return id;
}

function validateSessionId(id: unknown): string {
  if (typeof id !== 'string' || !/^[A-Za-z0-9._-]+$/.test(id)) {
    throw new Error(
      'session_id must contain only alphanumeric characters, dots, hyphens, or underscores',
    );
  }
  return id;
}

// ── Error extraction ──────────────────────────────────────────────────────────
const ERROR_SIGNALS = [
  'FlutterError',
  'Exception',
  'Expected:',
  'Actual:',
  '══',
  'FAILURES!!!',
  'INSTRUMENTATION_CODE',
  'Error:',
  'TimeoutException',
  'StateError',
  'Unhandled',
];

function extractErrorBlock(log: string): string {
  const lines = log.split('\n');
  const marked = new Set<number>();

  lines.forEach((line, i) => {
    if (ERROR_SIGNALS.some((s) => line.includes(s))) {
      for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 20); j++) {
        marked.add(j);
      }
    }
  });

  if (marked.size === 0) {
    // No recognised pattern — return last 60 lines (failure usually at end)
    return lines
      .slice(-60)
      .map((l, i) => `${lines.length - 60 + i + 1}: ${l}`)
      .join('\n');
  }

  const sorted = [...marked].sort((a, b) => a - b);
  return sorted.map((i) => `${i + 1}: ${lines[i]}`).join('\n');
}

// ── MCP Server ────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: 'lambda-test-mcp',
  version: '1.0.0',
});

server.tool(
  'get_build_failures',
  'List all failed test sessions in a LambdaTest App Automation build. Returns session IDs, test names, duration, and direct dashboard URLs. Use this first to find which sessions to debug.',
  {
    build_id: z.string().describe('LambdaTest build ID — visible in the build URL (e.g. 19305815)'),
  },
  async ({ build_id }) => {
    const validated_id = validateBuildId(build_id);
    const sessions = await client.getBuildSessions(validated_id);

    const failed = sessions.filter((s: LTSession) =>
      ['failed', 'error', 'timeout'].includes((s.status_ind ?? '').toLowerCase()),
    );

    if (failed.length === 0) {
      const statuses = [...new Set(sessions.map((s) => s.status_ind))].join(', ');
      return {
        content: [
          {
            type: 'text',
            text: `No failed sessions in build ${validated_id}.\nAll statuses: ${statuses || 'none'}`,
          },
        ],
      };
    }

    const rows = failed.map((s: LTSession) => ({
      session_id: s.id,
      test_name: s.name,
      status: s.status_ind,
      duration_s: s.duration,
      dashboard_url: `https://appautomation.lambdatest.com/test?testID=${s.id}`,
    }));

    return {
      content: [
        {
          type: 'text',
          text:
            `${failed.length} failed session(s) in build ${validated_id}` +
            ` (of ${sessions.length} total):\n\n` +
            JSON.stringify(rows, null, 2),
        },
      ],
    };
  },
);

server.tool(
  'get_session_error',
  'Fetch the filtered error block from a failed LambdaTest session instrumentation log. Returns only the ~50 lines around FlutterError / Exception / assertion failures — NOT the full log. Token-efficient.',
  {
    session_id: z.string().describe('LambdaTest session ID (e.g. RMAA-AND-1874607-...)'),
  },
  async ({ session_id }) => {
    const validated_id = validateSessionId(session_id);
    const log = await client.getSessionLog(validated_id);
    const block = extractErrorBlock(log);

    return {
      content: [
        {
          type: 'text',
          text: `Error block extracted from session ${validated_id}:\n\n${block}`,
        },
      ],
    };
  },
);

server.tool(
  'get_session_video',
  'Get the direct video URL for a LambdaTest test session. Returns the S3 video URL you can open or download to inspect the failure visually.',
  {
    session_id: z.string().describe('LambdaTest session ID'),
  },
  async ({ session_id }) => {
    const validated_id = validateSessionId(session_id);
    const session = await client.getSession(validated_id);

    if (!session.video_url) {
      return {
        content: [{ type: 'text', text: 'No video URL found for this session.' }],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: [
            `Test:     ${session.name}`,
            `Device:   ${session.device ?? 'unknown'} (Android ${session.os_version ?? '?'})`,
            `Duration: ${session.duration}s`,
            `Status:   ${session.status_ind}`,
            `Video:    ${session.video_url}`,
          ].join('\n'),
        },
      ],
    };
  },
);

// ── Start ─────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
