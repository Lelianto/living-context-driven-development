#!/usr/bin/env node

import { readFileSync } from "fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
  FileRegistry,
  ContextDoctor,
  DashboardService,
  ReviewManager,
  ContextVerifier,
  ImproveEngine,
  parseCQL,
  type Context,
  type LifecycleStage,
} from "@lcdd/core";

const projectRoot = process.env.LCDD_PROJECT_ROOT || process.cwd();
const registry = new FileRegistry(projectRoot);

// Read from package.json so the advertised version cannot drift from the release.
const PKG_VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
).version as string;

const TOOLS = [
  {
    name: "lcdd_list_contexts",
    description: "List all LCDD contexts with optional filters by lifecycle, category, or tags.",
    inputSchema: {
      type: "object",
      properties: {
        lifecycle: { type: "string", description: "Filter by lifecycle stage (draft, candidate, approved, active, deprecated, archived)" },
        category: { type: "string", description: "Filter by category (e.g., security, performance, compliance)" },
        tags: { type: "string", description: "Filter by comma-separated tags" },
      },
    },
  },
  {
    name: "lcdd_get_context",
    description: "Get full details of a specific context by ID, including authority, governance, and enforcement rules.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Context ID (e.g., ctx-a1b2c3d4)" },
      },
      required: ["id"],
    },
  },
  {
    name: "lcdd_query_contexts",
    description: "Query contexts using CQL (Context Query Language). SQL-like syntax for filtering and sorting.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "CQL query string. Example: SELECT * FROM contexts WHERE lifecycle = 'active' AND category = 'security'" },
      },
      required: ["query"],
    },
  },
  {
    name: "lcdd_validate_artifact",
    description: "Validate a code artifact against all active contexts. Returns violations with severity and suggested fixes.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to validate" },
        content: { type: "string", description: "File content to validate (if not available on disk)" },
      },
      required: ["path"],
    },
  },
  {
    name: "lcdd_get_health",
    description: "Get the Context Health Report — score, grade, stale contexts, missing owners, conflicts, and recommendations.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "lcdd_get_dashboard",
    description: "Get enforcement dashboard metrics — violation trends, actor breakdown, top violated contexts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "lcdd_list_reviews",
    description: "List contexts pending review. Shows which can be auto-approved and why.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "lcdd_get_recommendations",
    description:
      "Get self-healing recommendations derived from enforcement observability data. " +
      "Read-only: reports what could be repaired and whether it needs human approval, but " +
      "never applies a change. Applying a heal is a human action performed via 'lcd improve apply'.",
    inputSchema: {
      type: "object",
      properties: {
        priority: {
          type: "string",
          description: "Filter by priority (immediate, short-term, long-term)",
        },
      },
    },
  },
];

const server = new Server(
  {
    name: "lcdd-mcp",
    version: PKG_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "lcdd_list_contexts": {
        const filter: Partial<Context> = {};
        if (args?.lifecycle) filter.lifecycle = args.lifecycle as LifecycleStage;
        if (args?.category) filter.category = args.category as string;
        const contexts = registry.list(filter);

        let results = contexts;
        if (args?.tags) {
          const tagList = (args.tags as string).split(",").map(t => t.trim().toLowerCase());
          results = contexts.filter(c => c.tags?.some(t => tagList.includes(t.toLowerCase())));
        }

        const output = results.map(c => ({
          id: c.id,
          title: c.title,
          lifecycle: c.lifecycle,
          severity: c.severity,
          category: c.category,
          authority_level: c.authority.level,
          governance: c.governance.classification,
          owner: c.owner || null,
          tags: c.tags || [],
          version: c.version,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify({ total: output.length, contexts: output }, null, 2) }],
        };
      }

      case "lcdd_get_context": {
        const ctx = registry.load(args?.id as string);
        if (!ctx) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Context not found: ${args?.id}` }) }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(ctx, null, 2) }],
        };
      }

      case "lcdd_query_contexts": {
        const cql = args?.query as string;
        const parsed = parseCQL(cql);
        const result = registry.query(parsed);

        const output = result.contexts.map(c => ({
          id: c.id,
          title: c.title,
          lifecycle: c.lifecycle,
          severity: c.severity,
          category: c.category,
          authority_level: c.authority.level,
          governance: c.governance.classification,
          enforcement_mode: c.enforcement?.mode || "not configured",
        }));

        return {
          content: [{ type: "text", text: JSON.stringify({ total: result.total, contexts: output }, null, 2) }],
        };
      }

      case "lcdd_validate_artifact": {
        const filePath = args?.path as string;
        const fileContent = args?.content as string | undefined;
        const active = registry.list({ lifecycle: "active" as LifecycleStage });
        const verifier = new ContextVerifier();
        const results = await verifier.verifyAll(active, filePath, fileContent);

        const violations = results.filter(r => r.status === "violation");
        const summary = {
          file: filePath,
          total_contexts_checked: results.length,
          violations_found: violations.length,
          violations: violations.map(v => ({
            context_id: v.context_id,
            status: v.status,
            violations: v.violations,
            confidence: v.confidence,
          })),
          compliant: results.filter(r => r.status === "compliant").length,
          not_applicable: results.filter(r => r.status === "not_applicable").length,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        };
      }

      case "lcdd_get_health": {
        const contexts = registry.list();
        const doctor = new ContextDoctor(projectRoot);
        const report = doctor.diagnose(contexts);

        const output = {
          overall_score: report.overall_score,
          max_score: report.max_score,
          grade: report.grade,
          total_contexts: report.total_contexts,
          metrics: report.metrics,
          recommendations: report.recommendations,
          triggers: report.triggers?.map(t => ({
            trigger: t.trigger,
            severity: t.severity,
            context_id: t.context_id,
            description: t.description,
            recommendation: t.recommendation,
          })),
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        };
      }

      case "lcdd_get_dashboard": {
        const contexts = registry.list();
        const dashboard = new DashboardService(projectRoot);
        const metrics = dashboard.compute(contexts);

        return {
          content: [{ type: "text", text: JSON.stringify(metrics, null, 2) }],
        };
      }

      case "lcdd_list_reviews": {
        const manager = new ReviewManager(registry);
        const items = manager.listPending();

        const output = items.map(item => ({
          id: item.context.id,
          title: item.context.title,
          lifecycle: item.context.lifecycle,
          review_status: item.context.review_status,
          governance: item.context.governance.classification,
          authority_level: item.context.authority.level,
          severity: item.context.severity,
          review_age_days: item.review_age_days,
          can_auto_approve: item.can_auto_approve,
          auto_approve_reason: item.auto_approve_reason || null,
          owner: item.context.owner || null,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify({ total: output.length, reviews: output }, null, 2) }],
        };
      }

      case "lcdd_get_recommendations": {
        const engine = new ImproveEngine(registry, new ContextDoctor(projectRoot));
        let plans = engine.plan();

        if (args?.priority) {
          plans = plans.filter(p => p.recommendation.priority === args.priority);
        }

        const output = plans.map(p => ({
          recommendation_id: p.recommendation.recommendation_id,
          trigger: p.recommendation.trigger,
          context_id: p.recommendation.context_id ?? null,
          action: p.recommendation.action,
          priority: p.recommendation.priority,
          severity: p.recommendation.severity,
          title: p.recommendation.title,
          description: p.recommendation.description,
          reason: p.recommendation.reason,
          confidence: p.recommendation.confidence,
          proposed_change: p.recommendation.proposed_change ?? null,
          executable: p.executable,
          requires_approval: p.requires_approval,
          blocked_reason: p.blocked_reason ?? null,
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              total: output.length,
              recommendations: output,
              note:
                "Read-only. To apply a recommendation a human must run " +
                "'lcd improve apply <recommendation-id>'. Hardened contexts additionally require " +
                "an explicit approval reason and are never modified automatically.",
            }, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (e) {
    // Deliberately omit the stack trace: it leaks absolute filesystem paths to
    // the connected client.
    return {
      content: [{ type: "text", text: JSON.stringify({ error: (e as Error).message }) }],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LCDD MCP Server started");
}

main().catch((e) => {
  console.error("LCDD MCP Server failed:", e);
  process.exit(1);
});
