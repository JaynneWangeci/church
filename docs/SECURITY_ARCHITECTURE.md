# AIPCA Bahati Cathedral — System Security & Architecture Document

**Prepared for:** Harambee Committee & Church Board  
**Date:** 22 June 2026  
**Version:** 1.0  
**Classification:** Confidential

---

## Table of Contents

1. Executive Summary
2. System Overview
3. Architecture Diagram
4. Component Architecture
5. Authentication & Authorization
6. Data Security
7. Network Security
8. Audit & Monitoring
9. Integration Security
10. Deployment Security
11. Incident Response
12. Recommendations

---

## 1. Executive Summary

The AIPCA Bahati Cathedral Harambee Management System is a full-stack web application for managing church fundraising, donations, pledges, and member administration. It processes financial transactions via M-Pesa, sends WhatsApp notifications, and provides role-based administrative access.

**Security posture:** The system implements defence-in-depth with JWT authentication, bcrypt password hashing, role-based access control (3 tiers), rate limiting, session management, audit logging, and data isolation between roles.

---

## 2. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    USERS / CLIENTS                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Public   │  │ Donors   │  │ Admins   │  │ Super Admins  │  │
│  │ (Viewer) │  │ (M-Pesa) │  │ (CRUD)   │  │ (Full Access) │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │             │             │                 │          │
└───────┼─────────────┼─────────────┼─────────────────┼──────────┘
        │             │             │                 │
        ▼             ▼             ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CDN / VERCEL EDGE                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Static Assets (dist/)                                   │   │
│  │  index.html, JS bundle, CSS, images                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    API LAYER (Vercel Serverless)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Express.js Router                                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐  │   │
│  │  │ Auth MW │ │RateLimit│ │Admin MW │ │Permission MW │  │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └──────┬───────┘  │   │
│  │       │           │           │              │           │   │
│  │  ┌────▼───────────▼───────────▼──────────────▼───────┐   │   │
│  │  │              Route Handlers                        │   │   │
│  │  │  auth │ members │ donations │ pledges │ admin...   │   │   │
│  │  └───────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    INTEGRATIONS                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │Supabase  │  │ Redis    │  │ M-Pesa   │  │ Twilio        │   │
│  │PostgreSQL│  │ (Cache)  │  │ Daraja   │  │ (WhatsApp)    │   │
│  │  + RLS   │  │          │  │ API      │  │               │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│  ┌──────────┐  ┌──────────┐                                     │
│  │ Resend   │  │ Lib re   │                                     │
│  │ (Email)  │  │ Translate│                                     │
│  └──────────┘  └──────────┘                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                       │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React SPA (Vite + TypeScript)                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌───────────────┐      │   │
│  │  │ Public  │ │ Admin   │ │ Shared        │      │   │
│  │  │ Pages   │ │Dashboard│ │ Components    │      │   │
│  │  └─────────┘ └─────────┘ └───────────────┘      │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │ Context: Language (EN/SW)                │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Security features in client:                             │
│  • Token stored in localStorage (not cookies)             │
│  • Token sent via Authorization header (Bearer)           │
│  • Sensitive data masked for viewer role                  │
│  • No hardcoded secrets in client code                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    SERVER (Node.js + Express)              │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Middleware Stack (order matters):               │   │
│  │  1. CORS                                         │   │
│  │  2. JSON body parser                             │   │
│  │  3. Rate limiter (300 req/min per IP)            │   │
│  │  4. Route dispatch                               │   │
│  │     │                                            │   │
│  │     ├─ requireAdmin  → JWT verify (line 236)     │   │
│  │     │   ↓                                        │   │
│  │     ├─ requireSuperAdmin → role check (line 255) │   │
│  │     │   ↓                                        │   │
│  │     ├─ requireAdminOrAbove → blocks viewer       │   │
│  │     │   ↓                                        │   │
│  │     └─ Route handler → permission check          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Security features in server:                             │
│  • JWT with 24h expiry                                   │
│  • bcrypt password hashing (10 rounds)                   │
│  • SHA-256 token hashing (sessions + reset tokens)       │
│  • Session invalidation on password change               │
│  • Login lockout after 5 failed attempts (15 min)        │
│  • Request ID tracking (UUID per request)                │
│  • Audit logging for all admin actions                   │
│  • Data masking for viewer role                          │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow

```
User → Login Form → POST /api/auth/login
                        │
                        ▼
              Validate email + password
                        │
               ┌────────┴────────┐
               ▼                 ▼
            Valid?           Invalid?
               │                 │
        ┌──────┴──────┐         ▼
        ▼             ▼    Record failed attempt
   Create session   Return    │
   + Sign JWT       token    ├─ 5+ fails? → Lock 15 min
        │                    └─ Return 401
        ▼
  Return { token, admin }
        │
        ▼
  Client stores token in localStorage
        │
        ▼
  All subsequent requests: Authorization: Bearer <token>
```

### 4.2 Role-Based Access Control (RBAC)

| Role | Permissions | Scope |
|---|---|---|
| **super_admin** | Full CRUD on all resources, manage admins, view audit logs, exports, settings | All data |
| **admin** | CRUD on members, donations, pledges, committee; read analytics, campaigns; exports | All data (except admin mgmt & audit logs) |
| **viewer** | Read-only on completed donations (phone masked), members, pledges, campaigns, analytics | Completed data only |

### 4.3 Token Structure

```typescript
// JWT Payload
{
  id: "uuid",
  email: "admin@church.org",
  role: "super_admin" | "admin" | "viewer",
  iat: 1719000000,
  exp: 1719086400  // 24 hours
}
```

### 4.4 Session Management

```
Login → JWT signed + stored in admin_sessions table (SHA-256 hashed)
Logout → Session deleted from table
Password Change → All sessions for admin deleted (force re-login)
Token Verify → jwt.verify() checks signature + expiry
```

---

## 5. Data Security

### 5.1 Encryption At Rest

| Data | Encryption |
|---|---|
| Passwords | bcrypt (10 rounds, salt auto-generated) |
| JWT tokens | HS256 with JWT_SECRET env var |
| Session tokens | SHA-256 before database storage |
| Reset tokens | SHA-256 before database storage |
| Database | Supabase managed (encrypted at rest by default) |
| Environment secrets | Vercel encrypted environment variables |

### 5.2 Encryption In Transit

- All API traffic over HTTPS (TLS 1.3 via Vercel + Cloudflare)
- Supabase connections use TLS
- M-Pesa API calls use HTTPS with SSL certificates
- No unencrypted internal traffic

### 5.3 Data Isolation (Viewer Role)

```typescript
// donations.ts - Viewer can only see completed donations
if (!admin) {
  query = query.eq("status", "completed");  // Public: completed only
} else if (admin.role === "viewer") {
  query = query.eq("status", "completed");  // Viewer: completed only
}

// Sensitive data masked for non-privileged roles
if (admin.role !== "super_admin") {
  donation.phone = donation.phone.slice(0, 6) + "****";  // Mask phone
  delete donation.receipt_number;  // Hide receipt
}
```

### 5.4 Password Policy

- Minimum 6 characters
- bcrypt hash (10 salt rounds)
- Rate-limited: max 5 attempts per 15-minute window
- Account lockout after 5 consecutive failures
- Failed attempts reset on successful login
- All password changes invalidate existing sessions

---

## 6. Network Security

### 6.1 Rate Limiting

| Layer | Limit | Scope |
|---|---|---|
| API rate limit | 300 requests/minute | Per IP address |
| Login rate limit | 5 attempts/15 minutes | Per email address |
| Password reset | Implicit rate limit | Per email address |

### 6.2 CORS Configuration

```
Access-Control-Allow-Origin: *  // Public API
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 6.3 Request Tracking

Every API request is assigned a UUID (`x-request-id` header) for traceability through audit logs.

---

## 7. Audit & Monitoring

### 7.1 Audit Logging

All admin actions are logged to the `audit_logs` table:

```typescript
interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_role: "super_admin" | "admin" | "viewer";
  action: AuditAction;  // e.g. "login", "create_member", "delete_pledge"
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string;
  immutable: boolean;  // true — logs cannot be deleted
}
```

### 7.2 Monitored Actions

| Category | Actions Logged |
|---|---|
| Authentication | login, logout, failed_login, password_reset, password_reset_request |
| Members | create, update, delete, bulk_create, bulk_edit, bulk_delete, dedup |
| Donations | create, update, delete, status_update |
| Pledges | create, update, delete, payment, adjustment |
| Admin Management | create_admin, update_admin, delete_admin, change_password |
| Security | view_audit_logs, view_sensitive_data |

---

## 8. Integration Security

### 8.1 M-Pesa Daraja API

```
STK Push Flow:
  Client → Server → M-Pesa API → Safaricom → Customer Phone
     ↑                                    │
     └────────────────────────────────────┘
          Callback with result

C2B Flow:
  Customer M-Pesa → Safaricom → Server (validation + confirmation callbacks)

Security:
  • All callbacks validated against expected payload
  • Transaction amounts verified server-side
  • Duplicate transaction detection via checkout_request_id
  • No M-Pesa credentials exposed to client
  • Environment variables for consumer key/secret
```

### 8.2 WhatsApp (Twilio)

```
  Pledge Reminder → Twilio API → Customer WhatsApp
  Payment Receipt → Twilio API → Customer WhatsApp

Security:
  • Twilio credentials stored in environment variables
  • Message content validated server-side
  • Phone numbers validated before sending
```

### 8.3 Email (Resend)

```
  Password Reset → Resend API → Admin Email

Security:
  • Resend API key in environment variables
  • Reset links include single-use tokens (SHA-256 hashed in DB)
  • Tokens expire after 1 hour
```

---

## 9. Deployment Security

| Measure | Implementation |
|---|---|
| Build pipeline | Vercel CI/CD — automatic build on git push |
| Environment variables | Stored in Vercel (encrypted at rest) |
| Secrets management | No secrets in codebase, all in env vars |
| Branch protection | main branch requires passing build |
| Production isolation | Serverless functions are ephemeral |
| Database access | Service role key restricted to server-side only |

### Environment Variables Required

```
JWT_SECRET=...
RESEND_API_KEY=...
RESEND_FROM=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=...
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
REDIS_URL=...
NEXT_PUBLIC_BASE_URL=...
```

---

## 10. Incident Response

### 10.1 Detecting Incidents

- Audit logs show all admin actions with timestamps and IP addresses
- Failed login attempts recorded with email and IP
- Rate limit breaches trigger 429 responses
- All API errors logged server-side with request IDs

### 10.2 Responding to Incidents

1. **Compromised admin account:** Use `/admin/reset-password` with known email, or a super_admin can change the password via admin management
2. **Suspicious activity:** Review audit logs for the affected admin's user ID
3. **Database breach:** Rotate Supabase service role key immediately
4. **M-Pesa discrepancy:** Cross-reference with Safaricom statement

### 10.3 Recovery Procedures

- **Lost JWT_SECRET:** Generate new one, all sessions become invalid
- **Lost Supabase access:** Contact Supabase support with project ref: `ktyfkzyigauhwqgfpjsc`
- **M-Pesa integration failure:** Re-register C2B URLs from admin dashboard

---

## 11. Security Recommendations

### Immediate (Implemented)

- ✅ JWT authentication with 24h expiry
- ✅ bcrypt password hashing (10 rounds)
- ✅ Rate limiting (API + login)
- ✅ Session management with invalidation
- ✅ RBAC with 3 admin tiers
- ✅ Audit logging for all admin actions
- ✅ Password reset with expiring tokens
- ✅ Data masking for viewer role
- ✅ Login lockout after 5 failed attempts

### Recommended for Next Phase

| Priority | Recommendation | Effort |
|---|---|---|
| High | Add 2FA (TOTP) for super_admin accounts | 2–3 days |
| High | Add IP whitelist for admin dashboard | 1 day |
| Medium | Add database backup automation | 0.5 day |
| Medium | Add rate limit for password reset endpoint | 0.5 day |
| Medium | Replace localStorage token with httpOnly cookie | 2 days |
| Low | Add Web Application Firewall (WAF) | Vendor setup |
| Low | Regular penetration testing | Quarterly |
| Low | Automated security scanning (CI/CD) | 1 day |

---

## Appendix A: Technology Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS |
| Backend | Node.js + Express.js |
| Runtime | tsx (TypeScript execution) |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash Redis |
| Auth | JWT (jsonwebtoken) |
| Password | bcryptjs |
| M-Pesa | Safaricom Daraja API |
| SMS/WhatsApp | Twilio API |
| Email | Resend API |
| Translation | LibreTranslate |
| Hosting | Vercel (frontend + serverless) |
| Version Control | GitHub (private) |

---

## Appendix B: File Map

```
church/
├── src/                        # Frontend (8,042 lines)
│   ├── pages/                  # Route pages
│   │   ├── HomePage.tsx        # Public landing
│   │   ├── AdminLogin.tsx      # Login
│   │   ├── AdminDashboard.tsx  # Full admin (2,660 lines)
│   │   ├── AdminSetup.tsx      # First-time setup
│   │   ├── ForgotPassword.tsx  # Password reset request
│   │   └── ResetPassword.tsx   # Password reset form
│   ├── components/             # Reusable UI
│   │   ├── ChurchHero.tsx
│   │   ├── SlideshowBackground.tsx
│   │   ├── LiveProgress.tsx    # Real-time donation bar
│   │   ├── FellowshipProgress.tsx
│   │   ├── PledgeBoard.tsx
│   │   ├── AboutSection.tsx
│   │   ├── ContributeSection.tsx
│   │   ├── DonationModal.tsx
│   │   ├── Footer.tsx
│   │   └── ...
│   ├── context/                # React contexts
│   │   └── LanguageContext.tsx
│   └── hooks/                  # Custom hooks
│       └── useInView.ts
│
├── server/                     # Backend (4,514 lines)
│   ├── routes/                 # Express route handlers
│   │   ├── auth.ts             # Auth + password reset
│   │   ├── admin.ts            # Admin CRUD + stats
│   │   ├── members.ts          # Member CRUD + bulk ops
│   │   ├── donations.ts        # Donation CRUD
│   │   ├── pledges.ts          # Pledge CRUD + pay
│   │   ├── mpesa.ts            # M-Pesa integration
│   │   ├── analytics.ts        # Dashboard analytics
│   │   ├── fellowships.ts      # Fellowship progress
│   │   ├── contributions.ts    # Excel/PDF export
│   │   ├── settings.ts         # Site settings
│   │   ├── committees.ts       # Committee CRUD
│   │   ├── councils.ts         # Council CRUD
│   │   └── ...
│   ├── lib/                    # Shared libraries
│   │   ├── admin.ts            # Auth + middleware + audit
│   │   ├── permissions.ts      # RBAC matrix
│   │   ├── supabase.ts         # DB client
│   │   ├── redis.ts            # Cache layer
│   │   └── ...
│   └── index.ts                # Express app entry
│
└── docs/                       # Documentation
    ├── INVOICE.md
    └── SECURITY_ARCHITECTURE.md # This document
```

---

**Document prepared by:** [Developer Name]  
**Reviewed by:** Harambee Committee  
**Date:** 22 June 2026  
**Next review:** 22 September 2026 (quarterly)
