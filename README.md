# WindowWorld — AI-First Window Sales Operating System

> Production-grade lead generation, field-sales, proposal, measurement-assist, quoting, invoicing, and mobile sync platform for replacement windows and exterior products. Built for Louisiana statewide territory with Baton Rouge as home base.

---

## 📋 Table of Contents

- [Vision](#vision)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Modules](#modules)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Development Phases](#development-phases)
- [User Roles](#user-roles)
- [Key Features](#key-features)

---

## Vision

WindowWorld is designed to maximize:
1. Qualified lead volume
2. Close rate
3. Rep productivity
4. Speed-to-proposal
5. Follow-up consistency
6. Measurement/order accuracy
7. Mobile usability in the field
8. Operational scalability

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Web | React 18 + TypeScript + Vite + Tailwind CSS |
| Mobile | PWA with offline-first architecture |
| Backend | Node.js + TypeScript (Express) |
| API | REST with modular service boundaries |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + RBAC |
| File Storage | Cloud object storage abstraction (S3-compatible) |
| PDF Generation | Puppeteer HTML-to-PDF pipeline |
| Email | Transactional email abstraction (Resend/SendGrid) |
| AI | Provider-agnostic abstraction layer |
| Mapping | Leaflet + OpenStreetMap / Mapbox |
| Background Jobs | BullMQ (Redis-backed) |
| Observability | Structured logging, audit trails, sync logs |

---

## Architecture

```
windowworld/
├── apps/
│   ├── web/          # React + Vite + Tailwind web app
│   └── mobile/       # PWA mobile experience
├── server/           # Node.js + TypeScript API
│   ├── modules/      # Feature modules (clean architecture)
│   ├── shared/       # Shared types, utilities, middleware
│   ├── jobs/         # Background job processors
│   └── prisma/       # Database schema + migrations
├── packages/
│   └── types/        # Shared TypeScript types
└── docs/             # Architecture docs
```

---

## Modules

Each module is independently maintainable with its own routes, services, and types:

| Module | Description |
|---|---|
| `auth` | Authentication, sessions, JWT |
| `users` | User management, profiles |
| `roles` | RBAC, permission system |
| `organizations` | Multi-org support |
| `territories` | Parish/zip territory management |
| `leads` | Lead intelligence engine |
| `lead-scores` | AI-powered lead scoring |
| `contacts` | Homeowners and contact management |
| `properties` | Property records |
| `appointments` | Scheduling, calendar |
| `inspections` | Field inspection workflow |
| `measurements` | Measurement capture + verification |
| `openings` | Window opening tracking |
| `products` | Product catalog |
| `quotes` | Quote builder |
| `proposals` | Proposal PDF generation |
| `invoices` | Invoice + payment module |
| `documents` | File storage, photo management |
| `ai-analysis` | Computer vision + AI inference |
| `automations` | Workflow automation engine |
| `analytics` | Dashboards + reporting |
| `notifications` | Email, SMS, push notifications |
| `campaigns` | Marketing campaign tracking |
| `integrations` | External service adapters |
| `admin` | Settings, configuration |

---

## Getting Started

### Prerequisites

- Node.js 22+ (required by Vite 7)
- PostgreSQL 15+
- Redis (for background jobs)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start development servers
npm run dev
```

This starts:
- **Web app**: http://localhost:5173
- **API server**: http://localhost:3001
- **Background jobs**: Automatically with the server

---

## Environment Setup

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis for BullMQ jobs
- `JWT_SECRET` — Auth token signing (min 32 chars in production)
- `OPENAI_API_KEY` — AI inference
- `S3_BUCKET_NAME` — File storage (Cloudflare R2 / AWS S3 compatible)
- `RESEND_API_KEY` — Transactional email
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — SMS
- `VITE_API_URL` — Frontend API base URL (set in `apps/web/.env.local`)
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth (frontend)

---

## User Roles

| Role | Description |
|---|---|
| Super Admin | Full system access |
| Sales Manager | Territory, rep, and pipeline management |
| Sales Rep | Field sales, leads, appointments, proposals |
| Field Measure Tech | Measurement capture and verification |
| Office Admin | CRM, scheduling, administrative |
| Finance/Billing | Invoices, payments, reports |
| Read-Only Analyst | Dashboard and reporting access |

---

## Development Phases

| Phase | Focus |
|---|---|
| Phase 0 | Repo scaffold, architecture, dependencies |
| Phase 1 | Auth, roles, layout shell, design system |
| Phase 2 | CRM, leads, properties, contacts, activities |
| Phase 3 | Mobile workflows, photo capture, offline queue |
| Phase 4 | AI photo analysis, window identification |
| Phase 5 | Measurement workflows, verification states |
| Phase 6 | Product catalog, pricing engine |
| Phase 7 | Quote builder, proposal PDF, invoices, email |
| Phase 8 | Automations, pitch coach, next-best-action |
| Phase 9 | Dashboards, analytics, territory maps |
| Phase 10 | QA, demo data, performance hardening |
| Phase 11 | Final cleanup, docs, GitHub verification |

---

## Key Features

### 🎯 Lead Intelligence Engine
AI-powered lead scoring using home age, weather exposure, neighborhood patterns, prior contact history, and more. Never claims certainty — outputs confidence scores and requires human review.

### 📱 Mobile Field Sales App
PWA with offline-first architecture. Supports offline photo capture, measurement entry, proposal drafting, and auto-sync when connectivity returns.

### 🪟 AI Window Identification
Computer vision workflow to analyze photos and identify window types, condition issues, and replacement complexity. All outputs are clearly labeled as AI-estimated and require human verification before order submission.

### 📐 Measurement Assist
Multi-mode measurement capture:
- Manual entry
- Guided mobile workflow
- AR-assisted estimation
- Reference-object photo estimation
- LiDAR when device supports it

All measurements require verification state before qualifying for final order.

### 💼 Proposal + PDF + Email
Branded, polished proposal PDFs with customer-friendly language and internal rep notes. Email directly from mobile. E-sign ready.

### 🌪️ Storm Opportunity Mode
Activates after major weather events to prioritize storm-damaged leads with urgency-based pitching and fast follow-up sequences.

### 💰 Financing-First Mode
Rewrites pitches for payment-sensitive customers, leading with monthly payment framing and financing options.

---

## Legal + Ethical Compliance

All lead scoring uses **lawful, explainable, consent-based, and publicly available signals** only. No invasive or disallowed data sources. AI outputs include:
- Confidence score
- Rationale
- Human override ability
- Audit trail
- Clear "estimated vs confirmed" distinction
