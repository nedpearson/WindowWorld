# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| All prior releases | ❌ |

Only the latest code on the `main` branch receives security fixes.

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities as public GitHub Issues.**

Use one of the following private channels:

### Option 1 — GitHub Private Vulnerability Reporting (Preferred)
Use the **"Report a vulnerability"** button on the [Security Advisories](https://github.com/nedpearson/WindowWorld/security/advisories) page. This keeps all communication private until a fix is released.

### Option 2 — Email
Send details to: **security@windowworldla.com**

Include:
- A clear description of the vulnerability
- Steps to reproduce
- The potential impact
- Any suggested mitigations (if known)

We will acknowledge your report within **48 hours** and provide a resolution timeline within **7 days**.

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials — use environment variables
- All API routes must be protected by the `authenticate` middleware
- Role-based access (`repOrAbove`, `manager`) must be enforced on sensitive routes
- User-supplied input must be validated with Zod before reaching service layer
- Database queries must use Prisma parameterized queries (no raw SQL with interpolation)
- File uploads are validated for MIME type and size before processing

## Disclosure Policy

We follow **Coordinated Vulnerability Disclosure (CVD)**. We ask that you:
1. Give us reasonable time to patch before public disclosure
2. Avoid accessing or modifying other users' data during research
3. Not perform denial-of-service testing against production systems

We will credit all good-faith reporters in the security advisory unless anonymity is requested.

## Dependency Management

- Dependabot is enabled for weekly dependency updates
- All PRs are automatically scanned for known CVEs
- Critical vulnerabilities are patched within **24 hours** of a fix being available
