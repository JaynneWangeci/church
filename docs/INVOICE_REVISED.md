# REVISED INVOICE — AIPCA Bahati Cathedral Harambee Management System

**Invoice No:** INV-2026-002 (Revised)  
**Date:** 22 June 2026  
**From:** [Developer Name]  
**To:** AIPCA Bahati Cathedral — Harambee Committee  
**Project:** Church Management & Fundraising Web Application  
**Live URL:** https://church-alpha-six.vercel.app

---

## Market Research — Kenyan Freelance Developer Rates 2026

| Source | Senior Rate (KES/hr) | Mid-Level Rate (KES/hr) |
|---|---|---|
| Lemon.io (2026 — Kenya data, n=146 contracts) | $30–35/hr ≈ KES 3,900–4,550 | $22–25/hr ≈ KES 2,860–3,250 |
| PayScale Kenya (Full Stack Dev salary) | KES 775K/yr ≈ KES 400/hr (employed) | — |
| Index.dev / Arc.dev (global, Africa region) | $25–40/hr ≈ KES 3,250–5,200 | $15–25/hr ≈ KES 1,950–3,250 |
| Local Kenyan market (direct client) * | KES 1,500–3,000/hr | KES 800–1,500/hr |

*\* Direct local rates are typically 40–60% below global platform rates due to cost-of-living adjustment, no platform commission, and long-term relationship pricing.*

**Rate used for this invoice:** KES 1,800/hr — below median senior freelance rate, reflecting direct engagement, no middleman, and church/community pricing.

---

## Scope Delivered

### What Was Built

| Module | Frontend | Backend | Integrations |
|---|---|---|---|
| Public website | Hero, slideshow, about section, footer | — | — |
| Live donation progress | Real-time bar, marquee ticker, countdown, LIVE badge | Campaign API | — |
| Fellowship progress | Per-fellowship bars ranked by performance | Progress API (sorted by giving) | — |
| Donation system | Donation modal, STK Push form, honour system | Donation CRUD, M-Pesa callback | M-Pesa Daraja API |
| Pledge board | 9 fellowships with pledge cards & progress | Pledge CRUD, payment, reminders | — |
| Admin dashboard | 8 tabs: overview, members, analytics, pledges, councils, committees, fellowship reports, site content | 65+ API endpoints | — |
| Admin auth | Login, forgot/reset password, setup | JWT auth, sessions, rate limiting | Email (Resend) |
| RBAC | Role-aware UI (super_admin, admin, viewer) | Permission middleware on all routes | — |
| WhatsApp messages | — | Pledge/payment/receipt messages | Twilio API |
| Auto-translate | EN/SW toggle throughout | LibreTranslate proxy | LibreTranslate |
| Security system | Data masking, role-based views | Audit logging, rate limiting, session mgmt | — |
| Export | — | Excel + PDF exports | — |
| Database | — | 12+ tables, RLS, migrations | Supabase |

### Metrics

| Metric | Count |
|---|---|
| Source files | 68 (37 TSX + 5 TS frontend, 26 TS server) |
| Lines of code | 12,556 |
| API endpoints | 65+ |
| Third-party integrations | 5 (M-Pesa, Twilio, Resend, LibreTranslate, Redis) |
| Database tables | 12+ |
| Admin roles | 3 (super_admin, admin, viewer) |

---

## Pricing (Revised — Kenyan Market Rate)

### Lump Sum: KES 280,000

| Item | Hours | Rate | Amount |
|---|---|---|---|
| **Frontend development** | | | |
| Landing page (hero, slideshow, about, footer) | 12 | KES 1,800/hr | KES 21,600 |
| Live progress bar + countdown + marquee | 8 | KES 1,800/hr | KES 14,400 |
| Fellowship progress (ranked bars, 30s poll) | 6 | KES 1,800/hr | KES 10,800 |
| Donation modal (STK Push, honour system, confetti) | 10 | KES 1,800/hr | KES 18,000 |
| Pledge board (9 fellowships, cards, progress) | 8 | KES 1,800/hr | KES 14,400 |
| Admin dashboard (8 tabs, all CRUD UIs) | 35 | KES 1,800/hr | KES 63,000 |
| Admin auth (login, forgot/reset password) | 6 | KES 1,800/hr | KES 10,800 |
| Language toggle (EN/SW context, translations) | 4 | KES 1,800/hr | KES 7,200 |
| Mobile responsive design | 6 | KES 1,800/hr | KES 10,800 |
| **Backend development** | | | |
| Auth system (JWT, sessions, rate limiting) | 8 | KES 1,800/hr | KES 14,400 |
| Member CRUD + bulk operations (add/edit/delete) | 10 | KES 1,800/hr | KES 18,000 |
| Donation + pledge management APIs | 10 | KES 1,800/hr | KES 18,000 |
| M-Pesa integration (STK Push, C2B, callbacks) | 12 | KES 1,800/hr | KES 21,600 |
| WhatsApp + email notifications | 6 | KES 1,800/hr | KES 10,800 |
| Analytics + fellowship report APIs | 6 | KES 1,800/hr | KES 10,800 |
| RBAC + audit logging + security middleware | 6 | KES 1,800/hr | KES 10,800 |
| Export (Excel, PDF) | 4 | KES 1,800/hr | KES 7,200 |
| **Database & Deployment** | | | |
| Schema design + migrations | 4 | KES 1,800/hr | KES 7,200 |
| Vercel deploy + environment config + CI/CD | 2 | KES 1,800/hr | KES 3,600 |
| Testing + bug fixing | 8 | KES 1,800/hr | KES 14,400 |
| **Total** | **155 hours** | **KES 1,800/hr** | **KES 280,000** |

### Payment Breakdown

| Item | KES |
|---|---|
| Full-stack web application (65+ APIs, 68 components, 12K LOC) | 195,000 |
| M-Pesa Daraja integration (STK Push + C2B + callbacks) | 30,000 |
| WhatsApp + Email notification system | 15,000 |
| Admin dashboard with RBAC (3 roles) + audit logging | 25,000 |
| Database design, migrations, deployment | 15,000 |
| **Total** | **KES 280,000** |

### Comparison — What This Would Cost Elsewhere

| Market | Estimated Cost | Source |
|---|---|---|
| Kenya (this invoice) | **KES 280,000 (~$2,150)** | Local market rate |
| India / Philippines | $5,000–8,000 | Index.dev 2026 |
| Eastern Europe | $8,000–15,000 | Lemon.io 2026 |
| Western Europe | $20,000–40,000 | Arc.dev 2026 |
| United States | $40,000–80,000 | SideStackers 2026 |

*The Kenyan rate is 5–10% of US rates and 30–50% of Indian rates, reflecting local cost-of-living and direct engagement (no platform commission).*

---

## Terms

- **Total:** KES 280,000 (Two Hundred and Eighty Thousand only)
- **Payment schedule:** 
  - 50% on agreement signing: KES 140,000
  - 50% on delivery: KES 140,000
- **Bank / M-Pesa:** [Insert your payment details]
- **Support:** 30 days post-delivery (bug fixes, no new features)
- **Post-support maintenance:** KES 1,800/hr or retainer at KES 25,000/month
- **Validity:** This quote is valid for 14 days

---

**Sources for market rates:**
1. Lemon.io — *Software Developer Salary in Kenya 2026: $20–$45/hr* (May 2026, n=146 contracts)
2. PayScale Kenya — *Full Stack Software Developer Salary KES 775K/yr* (2026)
3. Index.dev — *Freelance Developer Rates by Country 2026*
4. SideStackers — *Web Developer Rates 2026* (global benchmarks)
5. EarnifyHub — *Freelance Developer Rates 2026 by Stack*

---

**Prepared by:** [Developer Name]  
**Contact:** [Phone / Email]  
**Date:** 22 June 2026

*"I have reviewed the Kenyan freelance market data from 5 independent sources. This revised invoice reflects fair market pricing for an individual developer engaging directly with a church organization — significantly below agency rates and global platform benchmarks."*
