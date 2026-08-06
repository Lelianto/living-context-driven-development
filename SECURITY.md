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

- All dependencies are pinned and regularly audited.
- Context Protocol communication uses TLS 1.3.
- Authentication is required for all Registry write operations.
- Audit logs are immutable (append-only).
- Hardened context modification requires multi-factor approval.

See [specification/0014-security.md](specification/0014-security.md) for the full security model.

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.0 (Draft) | ✅ Yes |

As a pre-1.0 specification, security issues will be addressed in the next release. Critical vulnerabilities may trigger an immediate patch release.
