# Security Audit — Living Context Driven Development (LCDD) Reference Implementation

| Field | Value |
| --- | --- |
| Document title | Security Audit — LCDD Reference Implementation |
| Version | 1.0.0 |
| Date | 2026-08-08 |
| Classification | Internal — Self-Assessment |
| Audit scope | `@lcdd/core` 0.5.0, `@lcdd/cli` 0.5.0, `@lcdd/mcp` 0.5.0 |
| Repository | <https://github.com/Lelianto/living-context-driven-development> |
| Audit type | Security self-assessment (code review + dependency analysis) |
| Prepared for | LCDD maintainers, prospective adopters, external auditors |

> **Disclaimer.** This document is a self-assessment performed by project maintainers against the reference
> implementation as of version 0.5.0. It is not a certified third-party audit. Findings are based on static code
> review and dependency scanning; no penetration testing of deployed environments was performed. Re-run the
> verification steps in [Section 9](#9-verification-evidence) before relying on the current state.

---

## 1. Executive Summary

The LCDD reference implementation follows a **local-first, defense-in-depth posture** that is well suited to its
threat model: the MCP server uses stdio transport only (no network exposure), API keys are consumed exclusively from
the environment (never persisted to disk), context identifiers are constrained by a strict schema pattern that blocks
path traversal, YAML is parsed with the safe default schema of `js-yaml` v4, and the local registry directory
`.lcdd/` is excluded from version control.

The audit identified **2 High, 3 Medium, 3 Low, and 2 Informational findings**, plus 1 dependency advisory
(moderate). The most actionable issues are the **command-injection surface in the source connector**
([F-01](#f-01-command-injection-in-source-connector-high)) and the **unauthenticated, unbound dashboard server**
([F-02](#f-02-dashboard-web-server-exposed-without-authentication-medium)).

| ID | Finding | Severity | CVSS 3.1 | CWE | Status |
| --- | --- | --- | --- | --- | --- |
| F-01 | Command injection in source connector (`git`/`curl` via `execSync`) | High | 7.8 | CWE-78 | Open |
| F-02 | Dashboard web server binds all interfaces, no authentication, open CORS | Medium | 6.5 | CWE-668 | Open |
| F-03 | Stored XSS in web dashboard (untrusted context data in HTML) | Medium | 5.4 | CWE-79 | Open |
| F-04 | Third-party CDN script without Subresource Integrity | Low | 4.3 | CWE-829 | Open |
| F-05 | Unsanitized identifiers in snapshot/registry file paths (defense-in-depth) | Low | 3.1 | CWE-22 | Open |
| F-06 | Regular-expression denial of service via enforcement patterns | Low | 3.7 | CWE-1333 | Open |
| F-07 | Audit log integrity gaps vs `0014-security.md` (no hash chain, no access control, actor spoofing) | Medium | 5.9 | CWE-353 | Open |
| F-08 | Dependency advisory `uuid < 11.1.1` (moderate); pinning policy mismatch | Low | — (moderate) | CWE-1104 | Open |
| F-09 | LLM extraction may send source content to cloud providers | Low | 3.1 | CWE-200 | Open (documented) |
| F-10 | Website source connector performs outbound requests (SSRF by design) | Info | — | CWE-918 | Accepted risk |

---

## 2. Scope & Objectives

### 2.1 In scope

- `@lcdd/core` 0.5.0 — Context model, schema validation, `FileRegistry`, verifier, CQL, `ContextDoctor`,
  `TriggerEvaluator`, `ImproveEngine`, `ReviewManager`, `SourceConnector`, `DashboardService`, extractor providers.
- `@lcdd/cli` 0.5.0 — all `lcd` commands (init, context, validate, query, doctor, review, source, extract, normalize,
  dashboard, improve).
- `@lcdd/mcp` 0.5.0 — MCP server (stdio transport, 8 tools).
- Packaging, dependency declarations, CI workflow, and the `.lcdd/` data model on disk.

### 2.2 Out of scope

- The specification documents under `specification/` (normative text, not code).
- The `website/` (Astro landing page) and `docs/` content.
- Third-party services (GitHub, npm registry, LLM providers, Ollama).
- Operating-system and physical security of machines running LCDD.

### 2.3 Objectives

1. Identify vulnerabilities that could compromise integrity of the Context Registry or the audit trail.
2. Identify ways a malicious context, source, or agent could execute code or exfiltrate data.
3. Measure the reference implementation against its own security specification (`specification/0014-security.md`)
   and against ISO 27001:2022, OWASP Top 10 (2021), OWASP ASVS 4.0, and NIST SP 800-53 expectations.
4. Produce a prioritized, verifiable remediation plan.

---

## 3. Methodology

The assessment combined:

- **Static code review** of all TypeScript modules under `implementation/packages/` (core SDK, CLI commands, MCP server).
- **Dependency analysis** via `npm audit` (SCA) and inspection of `package.json` manifests.
- **Threat modeling** using STRIDE against the assets and actors defined in `0014-security.md`.
- **Standards mapping** to ISO 27001:2022 Annex A, OWASP ASVS 4.0 (Level 1 baseline), OWASP Top 10 (2021),
  NIST SP 800-53, and CWE.
- **Severity scoring** using CVSS v3.1 (approximate, for internal prioritization).

---

## 4. Asset & Threat Model

### 4.1 Assets

| Asset | Sensitivity | Integrity impact |
| --- | --- | --- |
| Context definitions (`.lcdd/contexts/*.yaml`) | Medium–High | Malicious contexts can corrupt governance or block legitimate work |
| Enforcement events (`.enforcements.log`) | Medium | Reveals violation patterns and weak compliance points |
| Lifecycle + heal events (`.events.log`, `.heals.log`) | High | Tampering undermines the entire governance model |
| Snapshots (`.lcdd/snapshots/*.yaml`) | High | Restore points for the registry |
| API keys in environment (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) | Critical | Full control of LLM provider accounts |

### 4.2 Threat actors (implementation-relevant)

| Actor | Capability | Primary concern |
| --- | --- | --- |
| Malicious Git repository / website registered as a source | Supplies content and branch names | Command injection (F-01), SSRF (F-10), prompt injection into extraction (F-09) |
| Compromised AI agent | Calls MCP tools / writes code | Specification drift, abuse of `improve` recommendations |
| Malicious or careless context author | Writes context YAML | XSS via dashboard (F-03), ReDoS patterns (F-06) |
| Local network observer | Can reach the dev machine | Dashboard data exposure (F-02) |
| Supply-chain attacker | Publishes a compromised dependency | CDN/SRI (F-04), `npm audit` hygiene (F-08) |

---

## 5. Attack Surface Inventory

| Surface | Exposure | Notes |
| --- | --- | --- |
| `lcd` CLI | Local process, user-invoked | Writes to `.lcdd/`; runs `git` and `curl` (F-01) |
| `lcd dashboard --web` | TCP listener, **all interfaces** (F-02) | Port 9321, no authentication |
| `lcdd-mcp` server | stdio only | No network exposure — positive |
| `.lcdd/` files | Local filesystem | Append-only logs; no integrity hash chain (F-07) |
| LLM providers (OpenAI/Anthropic) | Outbound HTTPS when configured | Content disclosure (F-09); local Ollama is the default |
| Source connectors (git/website) | Outbound network | SSRF by design (F-10) |
| Environment variables | Process environment | Keys never written to disk — positive |

---

## 6. Detailed Findings

### F-01 Command Injection in Source Connector (High)

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | 7.8 (AV:L/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:H) |
| CWE | 78 (OS Command Injection) |
| Frameworks | OWASP Top 10 A03:2021 (Injection); ASVS V5.3; ISO 27001 A.8.28 (Secure coding) |
| Location | `implementation/packages/core/src/source-connector.ts:155, 172, 178, 227` |

**Description.** `execSync` executes shell commands with string interpolation of data that is at least partially
attacker-controlled:

- Line 155: `git clone --depth 1 "${source.url}" "${repoDir}"` — the source URL is interpolated (quoted) into a shell
  command.
- **Line 172: `git merge-base --is-ancestor HEAD origin/${headBranch}` — `headBranch` is interpolated unquoted.** It is
  obtained by `git rev-parse --abbrev-ref HEAD` on the cloned repository, so a malicious repository whose default
  branch contains shell metacharacters (e.g. `x$(touch /tmp/pwned)x`; Git permits `$()`, backticks, `;`, `"` in
  branch names) executes arbitrary commands when `lcd source check` runs.
- Line 178: `git merge --ff-only origin/${headBranch}` — same unquoted interpolation.
- Line 227: `curl -sL --max-time 15 "${source.url}"` — quoted, but still shell-interpolated; a URL crafted with
  breaking characters could inject.

**Impact.** Arbitrary command execution with the privileges of the user running `lcd source check/watch`. The attack
requires the victim to register a malicious source URL, which is plausible via a compromised Context Pack or a
socially engineered `lcd source add` instruction.

**Recommendation.** Replace all `execSync` calls with `execFileSync(command, [args])` (no shell). Validate source URLs
against a strict allow-list of schemes (`https://`, `git@`, `ssh://`) and reject characters unsafe for URLs; validate
`headBranch` against `^[A-Za-z0-9._/-]+$` before interpolation. Add an integration test with a fixture repository
whose branch name contains shell metacharacters.

---

### F-02 Dashboard Web Server Exposed Without Authentication (Medium)

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | 6.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N) |
| CWE | 668 (Exposure of Resource to Wrong Sphere), 306 (Missing Authentication) |
| Frameworks | OWASP Top 10 A01:2021; ASVS V2/V13; ISO 27001 A.5.15 (Access control), A.8.16 (Monitoring) |
| Location | `implementation/packages/cli/src/commands/dashboard.ts:226–242` |

**Description.** `createServer(...)` is started with `server.listen(port, ...)` and **no host argument**, which binds to
all network interfaces (`0.0.0.0`). The endpoint `/api/metrics` returns the full metrics JSON with the header
`Access-Control-Allow-Origin: *` and no authentication. Any device on the same network can read enforcement trends,
violation patterns, actor breakdowns, and context identifiers/titles.

**Impact.** Disclosure of governance and violation telemetry to any local-network peer; in untrusted networks the data
leaves the machine entirely.

**Recommendation.** Bind to loopback explicitly: `server.listen(port, '127.0.0.1')`. Replace the wildcard CORS header
with no CORS header (same-origin is sufficient) or an explicit allow-list. Document that `--web` is a development aid,
not a production service.

---

### F-03 — Stored Cross-Site Scripting in Web Dashboard | Medium

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | 5.4 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N) |
| CWE | 79 (Cross-site Scripting) |
| Frameworks | OWASP Top 10 A03:2021; ASVS V5.1; ISO 27001 A.8.28 |
| Location | `implementation/packages/cli/src/commands/dashboard.ts` — `getWebHtml()` interpolations |

**Description.** Context identifiers, titles, and lifecycle values are interpolated directly into the generated HTML
template without escaping, e.g. `${v.context_id}`, `${ctx.title.slice(0, 40)}`, `${metrics.health_grade}`. Titles are
free-form strings that may originate from LLM extraction or external sources, so a context whose title contains
`<script>…</script>` executes when a developer opens `http://localhost:9321`.

**Impact.** Script execution in the context of the developer's browser; potential to exfiltrate other localhost data
or masquerade in the dashboard.

**Recommendation.** HTML-escape every interpolated value (implement a small `escapeHtml` helper) or serve the dashboard
as a static page that consumes JSON via `fetch` and renders with `textContent`. Add a test asserting that a context
title containing `<script>` is rendered inert.

---

### F-04 — Third-Party CDN Script Without Subresource Integrity | Low

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | 4.3 (AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N) |
| CWE | 829 (Inclusion of Functionality from Untrusted Control Sphere) |
| Frameworks | OWASP Top 10 A08:2021; ASVS V14.2; ISO 27001 A.8.25 |
| Location | `implementation/packages/cli/src/commands/dashboard.ts` (Chart.js `<script src="https://cdn.jsdelivr.net/...">`) |

**Description.** The dashboard page loads Chart.js from a third-party CDN without an `integrity` (SRI) attribute. A
compromised or man-in-the-middled CDN response could execute arbitrary JavaScript in the dashboard page.

**Recommendation.** Add the SRI `integrity` attribute with the correct hash, or vendor Chart.js into the package. For
a fully offline product, vendoring is preferred (the project's Local First principle).

---

### F-05 — Unsanitized Identifiers in File Paths (Defense-in-Depth) | Low

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | 3.1 (AV:L/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N) |
| CWE | 22 (Path Traversal) |
| Frameworks | OWASP Top 10 A01:2021; ASVS V12; ISO 27001 A.8.28 |
| Location | `implementation/packages/core/src/registry.ts` — `getFilePath(id)`, `loadSnapshot(snapshotId)`, `restoreSnapshot(snapshotId)` |

**Description.** `getFilePath(id)` joins `id` directly into the contexts directory, and snapshot methods join
`snapshotId` into the snapshots directory. The schema pattern `^[a-zA-Z0-9_-]+$` blocks `..` and `/` for contexts
written through `save()`, and generated snapshot ids are safe. However, the registry **methods themselves do not
validate** `id`/`snapshotId`; SDK callers that bypass schema validation (or future protocol endpoints) could reach
paths outside `.lcdd/`.

**Recommendation.** Enforce the identifier pattern inside `FileRegistry` (single choke point) and resolve paths with
`path.resolve` + a prefix check. Note: `lcd show <id>` and `lcd transition <id>` pass user-supplied ids into
`getFilePath` without re-validation, so the vector is reachable via the CLI — but it is limited to reading
`*.yaml` files, which is why this finding is rated Low.

---

### F-06 — Regular-Expression Denial of Service via Enforcement Patterns | Low

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | 3.7 (AV:L/AC:H/PR:L/UI:N/S:U/C:N/I:N/A:L) |
| CWE | 1333 (Inefficient Regular Expression Complexity) |
| Frameworks | OWASP Top 10 A04:2021 (Insecure Design); ASVS V5.1.3 |
| Location | `implementation/packages/core/src/verifier.ts` — `regexVerifier` (`new RegExp(pattern, flags)`) |

**Description.** Enforcement specifications may contain arbitrary regular expressions that are tested against artifact
content. A catastrophic pattern (e.g. `(a+)+$`) against a large artifact can cause exponential backtracking and hang
the validation process. Patterns originate from context authors and potentially from LLM extraction.

**Recommendation.** Reject known-catastrophic patterns (heuristic or `safe-regex`-style check), cap artifact content
size before regex evaluation, and run verification under a timeout. At minimum, document that enforcement
specifications are trusted input.

---

### F-07 — Audit Log Integrity Gaps vs Specification 0014 | Medium

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | 5.9 (AV:L/AC:H/PR:L/UI:R/S:C/C:N/I:H/A:N) |
| CWE | 353 (Missing Support for Integrity Check), 287 (Improper Authentication) |
| Frameworks | OWASP Top 10 A09:2021 (Logging & Monitoring); ISO 27001 A.8.15 (Logging), A.8.16; NIST AU-2..6 |
| Location | `implementation/packages/core/src/registry.ts` (append-only JSONL); CLI actor sources |

**Description.** `0014-security.md` promises (a) a hash-chained audit trail, (b) immutable append-only logs with
access control, (c) multi-factor approval for hardened-context modification. The implementation provides append-only
JSONL logs but:

- No hash chain or per-entry integrity verification — any process with filesystem write access can edit or truncate
  the logs undetected.
- Actor identity is derived from `process.env.USER` (e.g. `cli/src/commands/context.ts`, `improve.ts`, `review.ts`),
  which is trivially spoofable.
- Hardened-context heals require an approval **reason** but not multi-factor authentication.
- The snapshot files themselves are not checksummed.

**Impact.** A malicious insider or compromised agent can alter the audit trail that the governance model relies on,
contradicting the guarantees stated in the specification.

**Recommendation.** Document the delta explicitly in `0014-security.md` (spec vs current implementation). Implement a
lightweight hash chain over log entries (SHA-256 of the previous entry) and optionally sign snapshots; treat the audit
trail as read-only outside LCDD operations; record actor identity from the authenticated process/user where available.

---

### F-08 — Dependency Advisory `uuid < 11.1.1` and Pinning Policy Mismatch | Low

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | n/a — advisory rated moderate (exact score not verified in this assessment) |
| CWE | 1104 (Use of Unmaintained Third-Party Components) |
| Frameworks | OWASP Top 10 A06:2021 (Vulnerable Components); ASVS V14.2; ISO 27001 A.8.9 (Technical vulnerabilities) |
| Location | `implementation/packages/core/package.json` (`uuid: ^10.0.0`); monorepo dependency policy in `SECURITY.md` |

**Description.** `npm audit --omit=dev` reports **1 moderate advisory**: `uuid < 11.1.1` (missing buffer bounds check
in v3/v5/v6 when a `buf` is provided). The codebase uses `uuid.v4()` without a buffer, so the practical impact is low,
but the advisory should not be carried. Additionally, `SECURITY.md` states "All dependencies are pinned", while the
manifests use caret ranges (`^…`), which permit minor/patch drift.

**Recommendation.** Upgrade `uuid` to `^11.1.1` (or 14.x on the next breaking release), add `npm audit --omit=dev` to
the CI workflow, and either pin exact versions or reword the policy to "locked within a specified range with
continuous auditing".

---

### F-09 — LLM Extraction Sends Source Content to Cloud Providers | Low

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | 3.1 (AV:L/AC:H/PR:L/UI:N/S:C/C:L/I:N/A:N) |
| CWE | 200 (Exposure of Sensitive Information) |
| Frameworks | ISO 27001 A.8.12 (Prevention of information leakage); GDPR data-protection considerations |
| Location | `implementation/packages/core/src/extractor.ts`; `extractor/openai.ts`, `extractor/anthropic.ts` |

**Description.** When `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set, `lcd extract` sends up to 6,000–8,000 characters
of source/change content to a third-party LLM. The default provider is local **Ollama** (privacy-preserving), but the
switch to a cloud provider is silent and content is not flagged. The spec's `confidential` marking
(`0014-security.md`) is not implemented in the schema.

**Recommendation.** Print a prominent notice when a cloud provider is selected; document the data-flow in the CLI
README; consider honoring a `confidential: true` context/source marker that forbids cloud extraction, per
`0014-security.md` §Data Protection. Keys are handled correctly (environment-only, never persisted) — no change needed
there.

---

### F-10 — Website Source Connector Performs Outbound Requests (SSRF by Design) | Info

| Attribute | Value |
| --- | --- |
| CVSS 3.1 | — (accepted risk) |
| CWE | 918 (Server-Side Request Forgery) |
| Frameworks | ISO 27001 A.8.23 (Web filtering) |
| Location | `implementation/packages/core/src/source-connector.ts:227` |

**Description.** Registering a website source causes `curl` to fetch an arbitrary URL from the local machine. This is
an intended capability (monitoring external policy/regulation pages), but the same primitive could probe
loopback/internal services if a malicious source is registered.

**Recommendation.** Document the capability as accepted risk. Optionally reject loopback and private-range targets
(`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`) by default with an
`--allow-private` opt-out.

---

## 7. Positive Security Posture

The following controls were verified and are worth preserving:

- **MCP transport is stdio-only** — no network listener is opened by the MCP server.
- **No stack-trace leakage** — MCP error responses deliberately omit stack traces (absolute paths) — see
  `implementation/packages/mcp/src/index.ts`.
- **Schema-constrained identifiers** — `id` pattern `^[a-zA-Z0-9_-]+$` blocks path traversal at the validation layer.
- **Safe YAML defaults** — `js-yaml` v4 `load()` uses the default (safe) schema; no custom tags are registered, so no
  deserialization gadget was identified.
- **Validation before write** — `FileRegistry.save()` runs full schema + semantic validation before persisting;
  snapshots are written before any heal mutation.
- **Self-healing guardrails** — `ImproveEngine` refuses to auto-modify hardened contexts, requires approval reasons,
  snapshots before mutation, and auto-rolls-back on health regression.
- **Secrets in environment only** — provider API keys are never written to `.lcdd/`.
- **`.lcdd/` is git-ignored** — local registry and event logs are not committed to the repository.
- **Local-first default** — `lcd doctor`, `dashboard`, and extraction default to no external dependency (Ollama local).
- **Extensible verifier registry** — built-in verifiers are minimal (regex, file-exists); third-party verifiers run
  in-process and must be treated as trusted code (documented, not auto-loaded from untrusted locations).

---

## 8. Compliance Mapping

### 8.1 ISO 27001:2022 Annex A (curated)

| Control | Status | Notes |
| --- | --- | --- |
| A.5.15 Access control | Partial | CLI is local-user driven; dashboard has no auth (F-02) |
| A.6.8 Security event reporting | ✅ Present | `SECURITY.md` disclosure policy (72 h acknowledgment) |
| A.7.10 Storage media | Partial | Snapshots are plain YAML, not encrypted at rest |
| A.8.9 Technical vulnerability management | Partial | No SCA step in CI (F-08) |
| A.8.11 Data masking | ✅ Present | Actor breakdown aggregated to human/ai-agent (guardrail 9) |
| A.8.12 Prevention of information leakage | Partial | Cloud LLM extraction unflagged (F-09) |
| A.8.15 Logging | ✅ Present | Append-only JSONL lifecycle/enforcement/heal logs |
| A.8.16 Monitoring activities | ✅ Present | `lcd doctor`, triggers, dashboard |
| A.8.23 Web filtering | Partial | SSRF surface accepted (F-10) |
| A.8.24 Use of cryptography | ❌ Absent | No hash chain / at-rest encryption (F-07) |
| A.8.25–28 Secure development lifecycle | Partial | Guardrails + tests exist; SAST absent in CI |
| A.8.29 Security testing in development | Partial | Unit tests present; no DAST/pen tests |
| A.8.34 Protection during audit testing | ✅ N/A | Audit is self-assessment |

### 8.2 OWASP Top 10 (2021) coverage

| Category | Findings |
| --- | --- |
| A01 Broken Access Control | F-02 |
| A03 Injection | F-01, F-03 |
| A04 Insecure Design | F-06 |
| A05 Security Misconfiguration | F-02, F-08 |
| A06 Vulnerable Components | F-08 |
| A08 Software & Data Integrity | F-04 |
| A09 Logging & Monitoring Failures | F-07 |

### 8.3 NIST SP 800-53 (curated)

`AC-6` (least privilege) — partial; `AU-2/3/6` (audit) — partial (F-07); `RA-5` (vulnerability scanning) — partial
(F-08); `SA-11` (developer testing) — partial; `SC-7` (boundary protection) — partial (F-02); `SI-10` (input
validation) — partial (F-01, F-05, F-06).

---

## 9. Verification Evidence

Reproduce or re-verify each finding with the commands below (run from the repository root, Node ≥ 18):

```bash
# F-01 (static): confirm shell interpolation in the source connector
grep -n "execSync" implementation/packages/core/src/source-connector.ts

# F-02 (dynamic): confirm the dashboard binds all interfaces
cd implementation && npm run build --workspaces
npx lcd dashboard --web & sleep 2
lsof -nP -iTCP:9321 -sTCP:LISTEN        # note "*:9321" (all interfaces) vs "127.0.0.1:9321"
curl -s http://127.0.0.1:9321/api/metrics | head -c 300

# F-03 (dynamic): create a context with a script tag in the title, open the dashboard
cd /tmp && npx @lcdd/cli init && npx @lcdd/cli context add   # title: <script>alert(1)</script>
npx @lcdd/cli dashboard --web

# F-08 (SCA): dependency advisory
cd implementation && npm audit --omit=dev

# F-07 (inspection): confirm logs are plain append-only JSONL without hashes
cat .lcdd/contexts/.events.log | tail -3
```

---

## 10. Remediation Roadmap

| Priority | Finding(s) | Action | Target release |
| --- | --- | --- | --- |
| P0 | F-01 | Replace `execSync` with `execFileSync`; validate URLs and branch names; add injection tests | v0.6.0 |
| P0 | F-02 | Bind dashboard to `127.0.0.1`; remove wildcard CORS | v0.6.0 |
| P1 | F-03 | HTML-escape all dashboard interpolation; add regression test | v0.6.0 |
| P1 | F-04 | Vendor Chart.js or add SRI integrity hash | v0.6.0 |
| P1 | F-08 | Upgrade `uuid` ≥ 11.1.1; add `npm audit` to CI; align pinning policy | v0.6.0 |
| P2 | F-07 | Document spec-vs-impl delta; add hash chain over log entries | v0.7.0 |
| P2 | F-06 | Pattern guard + size cap + verification timeout | v0.7.0 |
| P2 | F-09 | Cloud-provider notice; `confidential` marker honored by extractor | v0.7.0 |
| P3 | F-05 | Identifier validation inside `FileRegistry`; resolved-path prefix check | v0.8.0 |
| P3 | F-10 | Document accepted risk; optional loopback/private-range blocklist | v0.8.0 |
| P3 | — | Add SAST (e.g. `eslint-plugin-security`) and scheduled `npm audit` in CI | v0.8.0 |

---

## 11. Limitations

- Static-analysis only; no runtime penetration testing of multi-user or remote deployments was performed.
- The threat model assumes the local operator is non-malicious; insider threats with full filesystem access cannot be
  fully mitigated by an application layer.
- Findings reference source at the `v0.5.0` tag; line numbers may shift after refactoring. Re-verify before citing.
- CVSS scores are indicative and should be re-scored by the adopting organization's risk process.

---

## 12. References

1. `SECURITY.md` — vulnerability disclosure policy and supported versions.
2. `specification/0014-security.md` — the security model this audit measures against.
3. `specification/0005-context-registry.md`, `0008-verification.md`, `0009-observability.md` — registry, verifier, and
   observability requirements.
4. OWASP Top 10 (2021), OWASP ASVS 4.0, NIST SP 800-53 Rev 5, ISO/IEC 27001:2022 Annex A.
5. GitHub Advisory GHSA-w5hq-g745-h8pq (`uuid`).
6. Source files cited in Section 6: `implementation/packages/core/src/source-connector.ts`,
   `implementation/packages/cli/src/commands/dashboard.ts`, `implementation/packages/core/src/registry.ts`,
   `implementation/packages/core/src/verifier.ts`, `implementation/packages/core/src/extractor*.ts`,
   `implementation/packages/mcp/src/index.ts`.
