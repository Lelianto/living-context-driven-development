# @lcdd/mcp

**MCP Server for Living Context Driven Development**

Exposes LCDD governance tools to AI coding agents (Claude Desktop, Cursor, Cline, etc.) via the [Model Context Protocol](https://modelcontextprotocol.io).

---

## Install

```bash
npm install -g @lcdd/mcp
```

---

## Setup (Claude Desktop)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lcdd": {
      "command": "npx",
      "args": ["@lcdd/mcp"],
      "env": {
        "LCDD_PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

If `LCDD_PROJECT_ROOT` is not set, the current working directory is used.

---

## Tools Exposed

| Tool | Description |
|---|---|
| `lcdd_list_contexts` | List all contexts with optional filters (lifecycle, category, tags) |
| `lcdd_get_context` | Get full details of a context by ID |
| `lcdd_query_contexts` | Query contexts using CQL (Context Query Language) |
| `lcdd_validate_artifact` | Validate a code file against all active contexts |
| `lcdd_get_health` | Context Health Report — score, grade, stale contexts, recommendations |
| `lcdd_get_dashboard` | Enforcement dashboard — violation trends, actor breakdown |
| `lcdd_list_reviews` | Pending reviews with auto-approval eligibility |
| `lcdd_get_recommendations` | Read-only self-healing recommendations with confidence and proposed changes |

`lcdd_get_recommendations` is deliberately read-only: an AI agent may inspect a heal plan, but applying one is a human action via the CLI (`lcd improve apply`). Agents must never heal unattended.

---

## Example AI Agent Interactions

**"Check if this file violates any constraints":**
> Agent calls `lcdd_validate_artifact` with file content → returns violations with context IDs and descriptions.

**"What's the health of this project's governance?":**
> Agent calls `lcdd_get_health` → returns score, grade, stale contexts, and actionable recommendations.

**"What should be healed, and how?":**
> Agent calls `lcdd_get_recommendations` → returns plans with recommendation ids, confidence, and proposed changes. Applying one stays a human action: `lcd improve apply <id> --dry-run` to preview, `--yes` to execute.

**"Are there security rules I should know about before coding?":**
> Agent calls `lcdd_query_contexts` with `SELECT * FROM contexts WHERE lifecycle = 'active' AND category = 'security'` → returns all active security contexts.

---

## Development

```bash
cd implementation
npm install
npm run build --workspace=packages/mcp
```

Test locally:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node packages/mcp/dist/index.js
```

---

## Related

- [@lcdd/core](https://www.npmjs.com/package/@lcdd/core) — Core SDK
- [@lcdd/cli](https://www.npmjs.com/package/@lcdd/cli) — CLI tool
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

Apache 2.0
