# Local npm Release Preparation

This workflow prepares and tests npm tarballs without publishing them. It is the required local
gate for v0.6.0 and later releases.

## v0.6.0 readiness gate

Do not change package versions to `0.6.0` until all v0.6 implementation slices and their public
contracts are complete. Before creating the final tarballs:

1. set the root implementation and all three package versions to `0.6.0`;
2. set CLI and MCP dependencies to `"@lcdd/core": "^0.6.0"`;
3. update `implementation/package-lock.json` using `npm install --package-lock-only`;
4. reconcile the changelog, both roadmaps, public README, FAQ, website, MCP tool count, and schemas;
5. run `npm run verify:release`;
6. run `npm run release:local -- 0.6.0`.

The local release command may target the next version before repository manifests are bumped. It
creates temporary staged manifests for the requested version; tracked source manifests remain
unchanged. This is for consumer testing only and does not make the target version release-ready.

The command builds and tests every workspace, checks package README tables and code
fences, validates self-governance, creates clean tarballs, installs all three tarballs into a
temporary consumer project, imports Core, and executes the packaged CLI.

Tarballs are written to:

```text
implementation/.artifacts/npm/0.6.0/
├── lcdd-core-0.6.0.tgz
├── lcdd-cli-0.6.0.tgz
└── lcdd-mcp-0.6.0.tgz
```

Inspect package contents before publishing:

```bash
npm pack --dry-run --workspace=@lcdd/core
npm pack --dry-run --workspace=@lcdd/cli
npm pack --dry-run --workspace=@lcdd/mcp
```

Publishing is deliberately separate and requires explicit authorization. Publish in dependency
order: `@lcdd/core`, then `@lcdd/cli`, then `@lcdd/mcp`. Never use `latest` for an incomplete or
release-candidate build.
