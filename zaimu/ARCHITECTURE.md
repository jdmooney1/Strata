# ZAIMU — System Architecture

## Overview

Zaimu is an AI-native cross-border asset ownership operating system designed for Japanese institutional and corporate investors managing overseas real assets.

**Version:** 1.0 (V1 — Cross-Border Real Estate Focus)  
**Stack:** Next.js 16 · TypeScript · Tailwind v4 · Prisma v7 · PostgreSQL

---

## Platform Modules

```
┌─────────────────────────────────────────────────────────────────┐
│                     ZAIMU PLATFORM                              │
├─────────────┬──────────────┬──────────────┬────────────────────┤
│  Portfolio  │    Asset     │   Document   │   Board Reporting  │
│  Overview   │ Intelligence │ Intelligence │      Engine        │
├─────────────┼──────────────┼──────────────┼────────────────────┤
│  Treasury   │   Workflow   │Institutional │   Alert & Task     │
│  & FX Layer │   & Tasks    │   Memory     │     System         │
└─────────────┴──────────────┴──────────────┴────────────────────┘
                          AI Layer (Claude API)
```

---

## Directory Structure

```
zaimu/
├── app/
│   ├── (platform)/          # Authenticated platform
│   │   ├── layout.tsx        # Sidebar + topbar layout
│   │   ├── dashboard/        # Operational dashboard
│   │   ├── portfolio/        # Portfolio overview
│   │   ├── assets/           # Asset register
│   │   │   └── [id]/         # Asset detail page
│   │   ├── documents/        # Document intelligence
│   │   ├── tasks/            # Task management
│   │   ├── alerts/           # Operational alerts
│   │   ├── treasury/         # Treasury & FX
│   │   ├── reports/          # Board reporting engine
│   │   └── memory/           # Institutional memory
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Redirect → /dashboard
│   └── globals.css           # Design system tokens
│
├── components/
│   ├── ui/                   # Base UI components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── stat-card.tsx
│   │   ├── status-badge.tsx
│   │   ├── score-ring.tsx
│   │   ├── alert-item.tsx
│   │   ├── data-table.tsx
│   │   ├── progress-bar.tsx
│   │   ├── ai-insight.tsx
│   │   └── timeline.tsx
│   └── platform/             # Platform-specific
│       ├── sidebar.tsx        # Navigation sidebar
│       ├── topbar.tsx         # Top header bar
│       └── alert-banner.tsx   # Dismissible alert banner
│
├── lib/
│   ├── utils.ts              # Formatting, classification utilities
│   └── mock-data.ts          # Sample data (Sanyo Capital Holdings)
│
└── prisma/
    └── schema.prisma         # Full database schema
```

---

## Database Schema

### Core Models

| Model | Description |
|-------|-------------|
| `Organisation` | Investor entity (corporate, family office, fund) |
| `User` | Platform users with role-based access |
| `Portfolio` | Asset grouping container |
| `Asset` | Core asset record with health scores |
| `OwnershipEntity` | SPV/ownership structure per asset |
| `Loan` | Debt facilities with full covenant tracking |
| `LoanCovenant` | Individual covenant tests (LTV, DSCR, ICR, etc.) |
| `AmortisationSchedule` | Debt service calendar |
| `Lease` | Tenant lease records with break/renewal dates |
| `CapexItem` | Capital expenditure tracking |
| `Valuation` | Periodic valuation history |
| `PmReport` | Property manager monthly reports |
| `CashFlow` | Actual and forecast cash flows |
| `FxRate` | FX rate history for conversion |
| `Document` | Document registry with AI extraction |
| `DocumentObligation` | Extracted obligations and deadlines |
| `Report` | Board reports with approval workflow |
| `Task` | Operational task management |
| `Alert` | System-generated operational alerts |
| `InstitutionalMemory` | Decision and context capture |
| `AuditLog` | Full audit trail |

---

## Asset Health Framework

Every asset carries two operational health scores (0–100):

**Operational Score** — Derived from:
- Occupancy rate vs. market
- DSCR vs. covenant threshold
- LTV vs. covenant threshold
- Capex burn rate
- PM report submission timeliness

**Reporting Score** — Derived from:
- PM report completeness
- Document currency (valuations, insurance)
- Covenant test frequency
- Board report submission

Thresholds:
- **≥ 75**: Green — Healthy
- **50–74**: Amber — Watch
- **< 50**: Red — Action Required

---

## Alert System

Alerts are generated automatically by system triggers:

| Alert Type | Trigger |
|-----------|---------|
| COVENANT_BREACH | Covenant test fails threshold |
| COVENANT_WATCH | Covenant within 10% of threshold |
| LOAN_MATURITY | < 18 months to loan maturity |
| LEASE_EXPIRY | < 12 months to lease expiry |
| LEASE_BREAK | Break clause window approaching |
| REPORT_OVERDUE | PM report not received by day 15 |
| FX_THRESHOLD | FX move > configured tolerance |
| OCCUPANCY_DROP | Occupancy drops > 5% MoM |
| DOCUMENT_EXPIRY | Key document expires in < 90 days |

---

## AI Layer

The AI layer (Claude API) powers:

1. **Document Extraction** — Extract dates, obligations, covenants, parties from any document
2. **PM Report Analysis** — Summarise reports, flag anomalies, extract key metrics
3. **Board Report Generation** — Draft institutional Japanese board packs
4. **Portfolio Commentary** — Summarise portfolio health and recommend actions
5. **Institutional Memory Search** — Semantic search across decision history

AI tone principles:
- Measured and institutional — never hype language
- Always flag uncertainty — never overstate confidence
- Recommend actions, not decisions
- Bilingual output (Japanese primary, English secondary)

---

## Reporting Workflow

```
Data Ingestion → AI Extraction → Draft Generation → Human Review → Board Approval → Publication
     ↑                                                    ↓
PM Reports                                          Revision Loop
Loan Statements
Valuations
FX Rates
```

Board report types:
- Monthly Board Report (月次取締役会報告書)
- Quarterly Portfolio Review (四半期レビュー)
- Refinancing Memo (リファイナンスメモ)
- Covenant Compliance Report (コベナンツ報告書)
- FX Exposure Report (為替エクスポージャー報告書)

---

## Design System

Palette: Deep Navy (#0d1526) + Institutional Slate
Typography: Geist Sans (UI) · Tabular numerics for financial data
Information density: High — tables preferred over charts
Language: Bilingual (Japanese labels, English interface)
Mode: Desktop-first, no dark mode in V1

---

## Implementation Roadmap

### V1 — Foundation (Current)
- [x] Platform architecture
- [x] Database schema (Prisma/PostgreSQL)
- [x] Design system and component library
- [x] Dashboard with operational KPIs
- [x] Asset register and detail pages
- [x] Portfolio overview
- [x] Document intelligence UI
- [x] Task management
- [x] Alert system
- [x] Treasury & FX tracking
- [x] Board reporting engine UI
- [x] Institutional memory

### V1.1 — Backend Integration
- [ ] Supabase / PostgreSQL connection
- [ ] Clerk authentication
- [ ] File upload with OCR pipeline
- [ ] Claude API document extraction
- [ ] FX rate API integration (e.g., Open Exchange Rates)

### V1.2 — AI Reporting
- [ ] Claude-powered board report generation
- [ ] PDF output (bilingual)
- [ ] Report approval workflow
- [ ] Email distribution

### V2 — Advanced Operations
- [ ] Automated PM report ingestion
- [ ] Covenant breach detection engine
- [ ] Refinancing pipeline management
- [ ] Distribution waterfall modelling
- [ ] Mobile-responsive design

### V3 — Platform Expansion
- [ ] Shipping assets module
- [ ] Infrastructure assets module
- [ ] Hospitality assets module
- [ ] Multi-investor platform (SaaS)
- [ ] White-label deployment
