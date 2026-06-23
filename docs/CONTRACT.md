# SOFTWARE DEVELOPMENT AGREEMENT

**Between:**  
**[Developer Name/Company]** ("Developer")  
**[Address]**

**And:**  
**AIPCA Bahati Cathedral — Harambee Committee** ("Client")  
**P.O. Box [_______], Nairobi, Kenya**

**Date:** 22 June 2026  
**Project:** Church Management & Fundraising Web Application  
**Agreement Reference:** CONT-2026-001

---

## 1. DEFINITIONS

1.1 **"System"** means the web application hosted at https://church-alpha-six.vercel.app, including all source code, database schema, API endpoints, documentation, and related materials described in Schedule A.

1.2 **"Deliverables"** means all work product delivered under this Agreement, including source code, documentation, and deployed system.

1.3 **"Go-Live"** means the date when the System is deployed to production and confirmed operational by both parties.

1.4 **"Support Period"** means 30 calendar days following Go-Live.

1.5 **"Intellectual Property"** means all copyrights, patents, trade secrets, and other proprietary rights.

---

## 2. SCOPE OF WORK

2.1 **Developer shall:**
   a) Develop and deliver the System as described in Schedule A (Scope of Work);
   b) Integrate third-party services as specified (M-Pesa Daraja API, Twilio WhatsApp, Resend Email, LibreTranslate);
   c) Deploy the System to Vercel production environment;
   d) Provide 30 days of post-launch support for bug fixes;
   e) Deliver complete source code via private GitHub repository.

2.2 **Client shall:**
   a) Provide timely access to all required third-party accounts and API credentials;
   b) Review and provide feedback on deliverables within 3 business days;
   c) Make timely payments as specified in Clause 4;
   d) Provide content, images, and text copy for the website.

---

## 3. FEES AND PAYMENT

3.1 **Total Fixed Fee:** KES 280,000 (Two Hundred and Eighty Thousand Kenyan Shillings only).

3.2 **Payment Schedule:**

| Milestone | Amount | Trigger |
|---|---|---|
| Upon signing | KES 140,000 (50%) | This Agreement signed by both parties |
| On Go-Live | KES 140,000 (50%) | System deployed and confirmed operational |

3.3 **Payment Method:** M-Pesa Paybill / Bank Transfer as per invoice.

3.4 **Late Payment:** If payment is not received within 14 days of the due date, Developer may suspend access to the System until payment is received.

---

## 4. INTELLECTUAL PROPERTY

4.1 **Ownership:** Upon full payment, the Developer assigns to the Client all rights, title, and interest in the Deliverables (the custom source code).

4.2 **Developer retains the right to:**
   a) Reuse general-purpose libraries, utilities, and patterns developed for this project in future work;
   b) Display the work in a portfolio (without exposing confidential data);
   c) Use the project as a reference case study.

4.3 **Third-party components:** The System incorporates open-source libraries (React, Express, etc.) under their respective licenses (MIT, Apache 2.0, etc.). These are not owned by either party.

---

## 5. CONFIDENTIALITY

5.1 Both parties agree to keep confidential:
   a) All non-public technical and business information;
   b) API keys, passwords, and access credentials;
   c) Church member data, donation records, and financial information.

5.2 This obligation survives termination of this Agreement for 2 years.

5.3 Developer shall not access, copy, or use Client data except as necessary to perform the Services.

---

## 6. WARRANTIES

6.1 **Developer warrants that:**
   a) The System will substantially conform to the specifications in Schedule A;
   b) The System will be free from material defects for 30 days post-Go-Live;
   c) The work will be performed professionally and in accordance with industry standards.

6.2 **Client warrants that:**
   a) It has all necessary rights to the content provided;
   b) It will comply with all applicable laws in using the System.

6.3 **Disclaimer:** THE SYSTEM IS PROVIDED "AS IS" AFTER THE SUPPORT PERIOD. DEVELOPER MAKES NO OTHER WARRANTIES, EXPRESS OR IMPLIED.

---

## 7. LIMITATION OF LIABILITY

7.1 Neither party shall be liable for indirect, incidental, or consequential damages.

7.2 Developer's total liability under this Agreement shall not exceed the total fees paid.

7.3 Developer is not liable for:
   a) Downtime or data loss caused by third-party services (M-Pesa, Vercel, Supabase, Twilio);
   b) Issues arising from unauthorized modifications to the System;
   c) Force majeure events.

---

## 8. DATA PROTECTION

8.1 Developer shall:
   a) Process personal data only as instructed by Client;
   b) Implement appropriate technical measures (encryption, access control, audit logging);
   c) Not retain Client data after termination.

8.2 Client is the Data Controller and is responsible for:
   a) Ensuring lawful basis for processing member data;
   b) Compliance with Kenya Data Protection Act (2019).

---

## 9. TERMINATION

9.1 Either party may terminate with 14 days written notice.

9.2 Developer may terminate immediately if payment is 30+ days overdue.

9.3 Upon termination:
   a) Client pays for work completed up to termination;
   b) Developer delivers all work product produced to date;
   c) Client receives a license to use incomplete work.

---

## 10. DISPUTE RESOLUTION

10.1 **Negotiation:** Parties shall first attempt to resolve disputes through good-faith negotiations.

10.2 **Mediation:** If negotiation fails, disputes shall be referred to a mediator agreed by both parties.

10.3 **Jurisdiction:** This Agreement is governed by the laws of the Republic of Kenya.

---

## 11. SUPPORT AND MAINTENANCE (POST-SUPPORT PERIOD)

11.1 After the 30-day Support Period, ongoing support is available at KES 1,800/hr or:
   - Monthly retainer: KES 25,000/month (up to 15 hours of support)
   - Additional hours: KES 1,800/hr

11.2 Support includes: bug fixes, minor updates, server monitoring, security patches.

11.3 Support does not include: new features, major redesigns, third-party API changes.

---

## 12. ACCEPTANCE OF DELIVERABLES

12.1 Upon delivery, Client has 7 business days to test and identify defects.

12.2 If no defects are identified, the Deliverable is deemed accepted.

12.3 If defects are identified, Developer shall fix them within 5 business days.

---

## 13. GENERAL

13.1 **Entire Agreement:** This Agreement constitutes the entire understanding between the parties.

13.2 **Amendments:** Changes must be in writing and signed by both parties.

13.3 **Severability:** If any provision is found unenforceable, the remainder remains in effect.

13.4 **Notices:** All notices shall be in writing and delivered via email.

---

## SCHEDULE A — SCOPE OF WORK

### A1. Frontend Application (React + Vite + TypeScript)

| Component | Description |
|---|---|
| Landing Page | Hero section, slideshow background, language toggle, section navigation |
| Live Progress Section | Real-time raised/goal bar, marquee ticker of recent donations, LIVE badge, countdown timer, pledge progress bar, share button |
| Fellowship Progress | Per-fellowship contribution bars ranked by performance, auto-polling every 30s |
| Donation Modal | M-Pesa STK Push form, honour system with "known as" input, confetti animation, chime sound |
| Pledge Board | 9 fellowship pledge cards with payment progress, icons, motivational messages |
| Admin Dashboard | 8 tabs (overview, members, admins, analytics, council, pledges, fellowship reports, site content) with full CRUD |
| Admin Authentication | Login, forgot password, reset password, first-time setup |
| About Section | 3D tilt cards, glass-morphism design, mission/vision/values |
| Footer | Contact info, church phone (clickable tel link), links |
| Mobile Bottom Bar | Give, Pledge, Call, Share buttons (mobile only) |
| Language System | English/Swahili toggle with LibreTranslate auto-translation for dynamic content |

### A2. Backend API (Node.js + Express + TypeScript) — 65+ Endpoints

| Module | Endpoints | Key Features |
|---|---|---|
| Authentication | POST /login, POST /logout, GET /me, POST /setup, GET /check-setup | JWT, 24h expiry, bcrypt |
| Password Reset | POST /forgot-password, POST /reset-password | SHA-256 tokens, 1hr expiry, email delivery |
| Admin Management | GET /users, POST /admins, PUT /users/:id, DELETE /users/:id | Super admin only |
| Members | GET /, POST /, PATCH /:id, DELETE /:id, POST /bulk-edit, POST /bulk-delete, POST /dedup, GET /template | Bulk operations, sanitization |
| Donations | GET /, POST /, PATCH /:id/status, GET /lookup/phone/:phone | Public create, admin manage |
| Pledges | GET /, POST /, PATCH /:id, DELETE /:id, POST /:id/pay-with-mpesa, POST /:id/adjust, POST /:id/verify-phone | Full lifecycle |
| M-Pesa | POST /stkpush, POST /callback, POST /c2b/validation, POST /c2b/confirmation, POST /register | Paybill 835872 |
| Analytics | GET /dashboard | Aggregated with Redis cache |
| Fellowship Report | GET /fellowship-report | Per-council breakdowns |
| Councils | GET /, POST /, PATCH /:slug, DELETE /:slug | Rank-ordered |
| Committee | GET /, POST /, PATCH /:id, DELETE /:id | Sortable |
| Contributions | GET /analytics, GET /export/ppt, GET /export/pdf, GET /export/xlsx | Charts + documents |
| Settings | GET /, PUT /, GET /harambee | Church phone, site content |

### A3. Integrations

| Service | Purpose | Type |
|---|---|---|
| M-Pesa Daraja API | STK Push payments, C2B auto-confirmations | Financial |
| Twilio WhatsApp | Pledge/payment/receipt/reminder messages | Notification |
| Resend Email | Password reset emails | Notification |
| LibreTranslate | English → Swahili auto-translation | Content |
| Upstash Redis | Analytics caching (60s TTL) | Performance |
| Supabase (PostgreSQL) | Primary database | Storage |

### A4. Security Features

- JWT authentication with 24-hour expiry
- bcrypt password hashing (10 rounds)
- Rate limiting: 300 req/min per IP
- Login lockout: 5 failed attempts → 15 min block
- Session management with SHA-256 hashed tokens
- RBAC: super_admin, admin, viewer roles
- Data isolation: viewer sees completed donations only
- Sensitive data masking: phone numbers masked for non-privileged
- Audit logging: all admin actions recorded (immutable)
- Request tracking: UUID per API request

### A5. Database Tables

admin_users, admin_sessions, church_members, donations, pledges, campaigns, councils, committee_members, password_reset_tokens, audit_logs, settings, admin_audit_actions

### A6. Exclusions (Not in Scope)

- Mobile native apps (iOS/Android)
- USSD integration
- Real-time chat or messaging between users
- Online streaming/video integration
- Third-party accounting software integration

---

## SCHEDULE B — PAYMENT SCHEDULE

| Payment | Amount | Due |
|---|---|---|
| Signing Fee (50%) | KES 140,000 | Upon execution of this Agreement |
| Go-Live Fee (50%) | KES 140,000 | Upon Go-Live acceptance |
| **Total** | **KES 280,000** | |

---

## SIGNATURES

**For the Developer:**

Name: _________________________________

Signature: _____________________________

Date: _________________________________

**For the Client (AIPCA Bahati Cathedral — Harambee Committee):**

Name: _________________________________

Title: _________________________________

Signature: _____________________________

Date: _________________________________

---

*This Agreement is made in duplicate. Both parties acknowledge reading and understanding its terms.*

---

**Annexure:** INVOICE_REVISED.md (Schedule of fees with market research)
**Annexure:** SECURITY_ARCHITECTURE.md (System architecture and security documentation)
