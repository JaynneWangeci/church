# INVOICE — AIPCA Bahati Cathedral Harambee Management System

**Invoice No:** INV-2026-001  
**Date:** 22 June 2026  
**From:** [Developer Name / Studio]  
**To:** AIPCA Bahati Cathedral — Harambee Committee  
**Project:** Church Management & Fundraising Web Application  
**Domain:** https://church-alpha-six.vercel.app  
**GitHub:** https://github.com/JaynneWangeci/church

---

## Scope of Work Delivered

### 1. Frontend Web Application (React + Vite + TypeScript)

| Module | Details | Size |
|---|---|---|
| Public Landing Page | Slideshow background, hero section, language toggle (EN/SW), section nav dots | 4 components |
| Donation System | Donation modal with STK Push, honour system ("known as"), confetti/chime | 2 components |
| Live Progress Bar | Real-time raised/goal bar, marquee ticker, LIVE badge, countdown timer, pledge progress, share button | 1 component |
| Fellowship Progress | Per-fellowship contribution bars, rank by performance, auto-poll 30s | 1 component |
| Pledge Board | 9 fellowships with pledges, payment progress, icons | 1 component |
| Admin Dashboard | 8 tabs: overview, members, admins, analytics, council, pledges, fellowship reports, site content | 1 large component |
| Admin Auth | Login page, forgot password, reset password, setup | 3 pages |
| About Section | 3D tilt cards, glass-morphism, edge fade | 1 component |
| Footer | Contact, links, church phone | 1 component |
| Mobile Responsive | Bottom action bar, responsive layouts throughout | Across all |
| Swahili Translation | LibreTranslate auto-translation, static translation maps | Context-wide |
| **Total Frontend** | **37 TSX + 5 TS files, ~8,000 lines** | |

### 2. Backend API (Node.js + Express + TypeScript)

| Module | Endpoints | Purpose |
|---|---|---|
| Auth System | 7 endpoints | Login, logout, setup, me, forgot/reset password, check-setup |
| Admin Management | 5 endpoints | CRUD admins, change password, audit actions |
| Members | 8 endpoints | CRUD, bulk-add, bulk-edit, bulk-delete, dedup, template |
| Donations | 4 endpoints | List, create, status update, phone lookup |
| Pledges | 9 endpoints | CRUD, pay, adjust, verify phone, search |
| M-Pesa | 6 endpoints | STK Push, callback, C2B validation/confirmation, register |
| Analytics | 1 endpoint | Dashboard data with caching |
| Councils | 4 endpoints | CRUD with rank sorting |
| Committee | 4 endpoints | CRUD |
| Campaigns | 1 endpoint | Campaign lookup |
| Fellowships | 1 endpoint | Progress by council, ranked by performance |
| Contributions | 7 endpoints | Analytics, export (PPT, PDF, XLSX) |
| Settings | 3 endpoints | Site settings, harambee |
| Reminders | 3 endpoints | Send reminders, verses, portfolio |
| Audit | 2 endpoints | Audit logs, actions |
| Translate | 1 endpoint | LibreTranslate proxy |
| **Total Backend** | **26 TS files, ~4,500 lines** | **~65+ API endpoints** |

### 3. Integrations

| Integration | Details |
|---|---|
| M-Pesa Daraja API | STK Push (paybill 835872), C2B validation/confirmation, transaction status |
| WhatsApp (Twilio) | Pledge/payment/reminder messages with Bible verses, receipt delivery |
| Email (Resend) | Password reset emails |
| LibreTranslate | Auto English→Swahili translation |
| Redis (Upstash) | Analytics caching, periodic refresh |

### 4. Database (Supabase / PostgreSQL)

| Tables | Purpose |
|---|---|
| admin_users, admin_sessions | Authentication & sessions |
| church_members | Member registry with council & gender |
| donations, pledges | Financial records |
| campaigns | Fundraising campaigns |
| password_reset_tokens | Secure password reset |
| audit_logs | All admin actions |
| councils, committee_members | Organization structure |
| settings | Site configuration |

### 5. Security

| Feature | Details |
|---|---|
| JWT authentication | 24h expiry, session invalidation |
| RBAC | 3 roles: super_admin, admin, viewer — enforced on all routes |
| Rate limiting | 300 req/min per IP, 5 failed login → 15 min lockout |
| Password hashing | bcrypt (10 rounds) |
| Token hashing | SHA-256 for reset tokens & session tokens |
| Data isolation | viewer: completed donations only, phone numbers masked |
| Audit logging | All admin CRUD + login/failed-login logged |
| CORS | API access control |

---

## Pricing

### Option A: Lump Sum — KES 450,000

| Item | Amount |
|---|---|
| Full frontend development (8 KLOC, 37 components) | KES 180,000 |
| Full backend API development (65+ endpoints, 4.5 KLOC) | KES 150,000 |
| M-Pesa + WhatsApp integration | KES 50,000 |
| Database design & migration | KES 30,000 |
| UI/UX design & mobile responsiveness | KES 30,000 |
| Deployment, CI/CD, environment configuration | KES 10,000 |
| **Total** | **KES 450,000** |

### Option B: Hourly — KES 3,200/hr × 150 hrs = KES 480,000

| Phase | Hours |
|---|---|
| Requirements analysis & planning | 10 |
| UI/UX design | 20 |
| Frontend development | 50 |
| Backend development | 40 |
| Integrations (M-Pesa, WhatsApp, Email) | 15 |
| Testing & bug fixing | 10 |
| Deployment & documentation | 5 |
| **Total** | **150 hours** |

---

## Terms

- **Payment:** 50% upfront + 50% on delivery
- **Bank / M-Pesa details:** [Insert your payment details]
- **Support period:** 30 days post-delivery (bug fixes)
- **Additional work:** KES 3,200/hr beyond scope

---

**Prepared by:** [Your Name]  
**Contact:** [Your Phone / Email]  
**Date:** 22 June 2026

---
*This invoice reflects the complete system as deployed and verified on the live domain. All 12,556 lines of TypeScript across 68 source files, 65+ API endpoints, 3 third-party integrations, and full mobile responsiveness are included.*
