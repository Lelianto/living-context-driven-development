# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the LCDD specification or reference implementations, please report it privately.

**Do not open a public issue.**

Send details to the project maintainers. We will respond within 72 hours with an acknowledgment and an estimated timeline for a fix.

## Scope

This security policy covers:

- Vulnerabilities in the Context Protocol that could allow unauthorized context modification.
- Vulnerabilities in the Context Schema that could allow injection or corruption.
- Vulnerabilities in reference implementations (CLI, MCP server, VS Code extension).
- Vulnerabilities in the Context Registry reference implementation.

## Out of Scope

- Vulnerabilities in third-party tools (GitHub, npm, etc.).
- Social engineering attacks.
- Physical security of systems running LCDD components.

## Secure Development

LCDD reference implementations follow these secure development practices:

- Dependency ranges are locked by `package-lock.json` and production dependencies are audited in CI.
- The current MCP implementation is local stdio-only; future network protocol deployments must use authenticated TLS.
- The file Registry relies on local filesystem permissions; remote Registry authentication is not implemented yet.
- Audit logs are append-only through the application but are not yet tamper-evident against a local filesystem writer.
- Hardened Contexts cannot be modified automatically; multi-factor approval is a future remote-governance requirement.

See [specification/0014-security.md](specification/0014-security.md) for the full security model.

## Supported Versions

| Version | Supported |
|---|---|
| 0.5.x (Implementation Phase) | ✅ Yes |

As a pre-1.0 specification, security issues will be addressed in the next release. Critical vulnerabilities may trigger an immediate patch release.
