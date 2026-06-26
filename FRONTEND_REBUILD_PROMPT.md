# Frontend Rebuild Prompt — AIPCA Bahati Cathedral Harambee

## Overview

This is a church fundraising (Harambee) platform for **AIPCA Bahati Cathedral** in Bahati, Nakuru County, Kenya. The backend is complete and working (Express + Supabase + M-Pesa). The frontend needs a complete UI rebuild — clean, modern, population-friendly (church congregation, not tech-savvy users — think elderly members, low literacy, mobile-first Kenya).

**Target audience:** Kenyan church congregation — mobile-first, mix of Swahili/English, simple and forgiving UI, large touch targets, readable fonts.

**Brand colors (maintain these):**
- Primary blue: `#08428c` (nobuk)
- Gold accent: `#C4964A` (amber)
- Light backgrounds: `#EFF6FF` (cream), `#DBEAFE`
- Text: `#1E293B` (ink), `#64748B` (muted)

## Tech Stack (FRONTEND ONLY — backend untouched)

- React 19 + Vite 6
- React Router v8+ (file-based routing via `react-router`)
- Tailwind CSS v4 (with Vite plugin)
- Framer Motion (animations)
- Lucide React (icons)
- Recharts (charts)
- react-countup (animated numbers)
- PDF.js (receipt viewing)

## Architecture

```
src/
├── pages/          # Page components (one per route)
├── components/     # Reusable UI components
├── lib/            # API client, helpers, types
├── i18n/           # Translations (English + Swahili)
├── types/          # TypeScript interfaces
├── App.tsx         # Root with Routes
├── main.tsx        # Entry point
└── index.css       # Tailwind + theme
```

## Routes Map

| Route | Page | Auth | Description |
|---|---|---|---|
| `/` | HomePage | Public | Landing page with all sections |
| `/admin/login` | AdminLogin | Public | Email/password login |
| `/admin/setup` | AdminSetup | Public | First admin creation (redirects if exists) |
| `/admin/forgot-password` | ForgotPassword | Public | Phone-based password reset |
| `/admin/reset-password` | ResetPassword | Public | OTP + new password |
| `/admin/dashboard` | AdminDashboard | Admin | Full admin panel (tab-based) |

## Design System Requirements

### Typography
- Body: Inter (system sans-serif fallback)
- Headings: Playfair Display (serif, elegant)
- Sizes: 12/14/16/18/20/24/30/36/48px scale
- Line-height: 1.5 body, 1.2 headings

### Component Library Philosophy
- **No heavy UI library** (no MUI, Chakra, etc.) — hand-crafted Tailwind components
- Every component must be accessible (ARIA labels, focus states, keyboard nav)
- Large touch targets (min 44px) for mobile users
- Text must remain readable when system font size is increased
- All interactive elements need loading states and disabled states

### Responsive Breakpoints
- Mobile: 320-767px (primary target — most users)
- Tablet: 768-1023px
- Desktop: 1024px+

## Page-by-Page Requirements

### 1. HomePage (`/`) — The Landing Page

This is the most important page. It's what congregation members see. Must load fast, look beautiful, and be dead simple to use.

**Sections (in order):**

**A. Hero Section**
- Full-screen viewport height
- Background: auto-rotating slideshow of church images (fade transition every 6s) with dark overlay (gradient black→transparent at bottom)
- Center content: Church name "AIPCA Bahati Cathedral" in gold, subtitle "Harambee Development Fund 2026"
- **Animated countdown** to target date (Sep 27, 2026) — shows days:hours:minutes:seconds in large numbers, auto-updates
- **Primary CTA button:** "GIVE NOW" — large, gold, prominent, pulsating gently (draws eye)
- **Secondary button:** "Make a Pledge"
- Both CTAs scroll smoothly to the Give section
- Bottom of hero: a thin progress bar overlay showing % of KES 5M goal reached, with "KES X raised so far!"

**B. Live Progress Section**
- Large animated progress bar (rounded, gradient fill blue→gold)
- Numbers that count up on scroll (react-countup):
  - Total Raised (KES)
  - Number of Donations
  - Number of Donors
  - Days Remaining
- All numbers update in real-time (poll every 30s from API)

**C. Fellowships Progress Section**
- List of church fellowships (councils) ranked by amount raised
- Each shows: fellowship name (human-readable), amount raised, progress bar, member count
- Mobile: compact layout (~50px per row), scrollable list
- Top fellowship gets a gold crown icon
- Swahili/English toggle affects labels only

**D. Men vs Women Challenge Section**
- Two cards side by side (stack on mobile): Men 👨 / Women 👩
- Each shows: total raised, number of donors, progress bar
- Donut chart showing percentage split
- Live indicator: "Men are leading by KES X" or "Women are leading by KES X"
- Playful but respectful tone

**E. About Section**
- Church photo on one side, description text on the other (stack on mobile)
- Brief history of AIPCA Bahati Cathedral
- Vision for the Harambee project

**F. How to Give Section — THE CRITICAL SECTION**
- Three clear steps in large cards:
  1. **M-Pesa Paybill** — Show: Business Number **522522**, Account **AIPCA2026** in a large copyable format (tap to copy)
  2. **STK Push** — "Click to Give" button that triggers M-Pesa STK push (requires entering amount + phone number in a simple form)
  3. **Bank Transfer** — Bank details if available
- Each card has a large icon, bold heading, and simple instruction
- The STK form must be SIMPLE: just amount input (KES), phone input, and "Give Now" button. Show loading spinner during processing.
- Success/error feedback immediately after STK push.

**G. Pledge Section**
- Simple form: Name, Phone, Amount, Frequency (One-time / Weekly / Monthly)
- "I Promise to Give" button
- After pledge: show confirmation with pledge details and a "Thank You" message
- List of recent pledges (name, amount, anonymous option)

**H. Honour Roll Section**
- Table/list of honoured members (people donations were made in honour of)
- Shows: honoured name, donor name, amount, date
- Search/filter by name

**I. Map & Contact Section**
- Static church map image (OpenStreetMap tile) with location pin
- "Open in Google Maps" and "View on Web" buttons (these open externally)
- Church address, phone, email, service times
- WhatsApp button (opens chat)

**J. Footer**
- Church name and copyright
- Quick links
- Social media links (if any)

**Global: Floating Action Bar (Mobile Only)**
- Fixed bottom bar with 4 buttons: Give, Pledge, Call Church, Share
- Appears on scroll, disappears at very bottom of page
- Give and Pledge scroll to respective sections
- Call opens phone dialer
- Share opens native share sheet

**Global: Section Navigation**
- Subtle dot indicators on the right side (desktop only)
- Clicking a dot scrolls smoothly to that section
- Active dot highlights as user scrolls

### 2. Admin Login (`/admin/login`)

- Clean, centered card on a gradient blue background
- Church logo/name at top
- Email input, Password input, "Sign In" button
- "Forgot Password?" link
- Error messages inline (not toasts)
- Loading state on submit
- Redirect to dashboard on success

### 3. Admin Setup (`/admin/setup`)

- Only accessible if no admin exists (check API on mount, redirect to login if exists)
- Form: Name, Email, Phone, Password, Confirm Password
- Password strength indicator
- "Create Account" button
- Redirect to login on success

### 4. Forgot Password (`/admin/forgot-password`)

- Phone number input only
- "Send Reset Code" button
- Success: "Check your phone for OTP" message with link to reset page

### 5. Reset Password (`/admin/reset-password`)

- OTP input (6 digits, individual boxes)
- New Password + Confirm Password
- "Reset Password" button
- Redirect to login on success

### 6. Admin Dashboard (`/admin/dashboard`) — THE COMPLEX ONE

**Layout:**
- Left sidebar (desktop) / Bottom tab bar (mobile) with navigation
- Top bar with church name, admin name/avatar, logout button
- Content area for active tab

**Sidebar/Tabs:**

1. **Overview** — Dashboard home
   - KPI cards row: Total Raised, Donations Count, Average Gift, Pending Amount
   - Progress bar toward KES 5M goal
   - Recent donations table (last 20) with donor, amount, method, date, honour status
   - Filter: date range, method (STK/Paybill/All)
   - Pagination (load more)
   - Honour member inline (typeahead search)
   - Export buttons: XLSX, PDF
   - Audit log section (super admin only) — recent actions with timestamp, admin name, details

2. **Members** — Church member management
   - Search bar with autocomplete
   - Filter by fellowship
   - Member list with select checkboxes
   - Add single member form
   - Bulk add: paste names or upload PDF
   - Bulk edit: move selected to different fellowship/gender
   - Merge duplicates (select survivor → confirms → merge)
   - Delete selected (with confirmation)
   - Inline edit: click name/fellowship/gender to edit

3. **Admins** — Admin user management
   - List of all admins (name, email, role, last login)
   - Add admin form: name, email, phone, password, role (admin/super_admin/viewer)
   - Edit admin: change role only
   - Cannot delete yourself

4. **Fellowship** — Committee & council management
   - Committee members list (ordered, can reorder via drag)
   - Add/edit/remove committee members
   - Council management: add/edit/delete councils
   - Council list shows member count

5. **Pledges** — Pledge tracking
   - List of all pledges with progress (paid/total)
   - Mark partial payment
   - Filter by status (active/fulfilled/overdue)
   - Search by name

6. **Reports** — Fellowship performance
   - Per-fellowship stats: members, total raised, donations count, avg per member
   - Sortable columns
   - Export XLSX, PDF

7. **Analytics** — Charts & trends
   - Time range selector: 7d/30d/90d/All
   - Area chart: donation trends over time
   - Bar chart: method comparison (STK vs Paybill)
   - Pie chart: method split
   - Hourly activity heatmap
   - Top donors list
   - KPI cards with period-over-period change (↑/↓ arrows)
   - Export buttons

8. **Security** — Security event console
   - Event feed with severity color coding (red=critical, yellow=warning, blue=info)
   - Auto-refresh every 30s
   - Filter by event type
   - Each event: timestamp, type, IP, details, admin name (if applicable)

9. **Settings** — Site configuration
   - Church phone, WhatsApp number
   - Harambee target date
   - M-Pesa settings (shortcode, passkey, consumer key/secret) — masked inputs
   - Theme color picker
   - Verse of the day editor
   - Test WhatsApp button
   - C2B register button
   - Save button per section

**Global Dashboard Features:**
- Member search modal — accessible from any tab, searches all members, shows full history
- All tables should be responsive (horizontal scroll on mobile, stacked cards on very small screens)
- All forms need validation with inline error messages
- All destructive actions need confirmation dialog
- Loading skeletons for all data-fetching states
- Empty states with helpful messages

## API Integration

The backend runs on the same domain (Vite proxy in dev, same origin in prod). All API routes are prefixed with `/api/`.

**Key endpoints the frontend calls:**

```
GET    /api/admin/stats                          — Dashboard KPIs
GET    /api/admin/audit-logs?page=&limit=        — Audit log (paginated)
POST   /api/auth/login                           — { email, password } → { token, admin }
POST   /api/auth/setup                           — First admin creation
POST   /api/auth/forgot-password                 — { phone }
POST   /api/auth/reset-password                  — { otp, password }
GET    /api/members?search=&council=&page=       — Members list
POST   /api/members                              — Create member
POST   /api/members/bulk                         — Bulk create
PUT    /api/members/:id                          — Update member
DELETE /api/members/:id                          — Delete member
POST   /api/members/:id/merge                    — Merge into member
POST   /api/members/dedup                        — Deduplicate
GET    /api/members/:id/history                  — Member full history
POST   /api/donations/:id/honour                 — Honour member
GET    /api/donations?from=&to=&source=&page=    — Donations list
GET    /api/pledges                              — Pledges list
POST   /api/pledges                              — Create pledge
POST   /api/pledges/:id/pay                      — Mark payment
POST   /api/mpesa/stk-push                       — { phone, amount } → STK
POST   /api/campaigns                            — CRUD campaigns
GET    /api/analytics/dashboard?range=           — Analytics data
GET    /api/analytics/trends?range=              — Trend data
GET    /api/contributions/export/xlsx            — Download XLSX
GET    /api/contributions/export/pdf             — Download PDF
GET    /api/security/events?page=&limit=&type=   — Security events
GET    /api/settings                             — Get settings
PUT    /api/settings                             — Update settings
GET    /api/fellowships/stats                    — Fellowship stats
POST   /api/committee                            — Committee CRUD
GET    /api/councils                             — Councils list
POST   /api/councils                             — Create council
DELETE /api/councils/:id                         — Delete council
GET    /api/verses/today                         — Daily verse
POST   /api/track/page-view                      — Track page view
```

**Auth:** JWT token stored in localStorage. Send as `Authorization: Bearer <token>` header. Admin routes return 401 if invalid/expired.

## State Management

- Use React Context for global state (auth, language, theme)
- Local state with `useState`/`useReducer` per page
- No Redux, no Zustand — keep it simple
- API calls via native `fetch` wrapped in a utility function

## Internationalization

- English + Swahili
- Simple object-based translations (no i18n library)
- `LanguageContext` provides `t(key)` function and `language` state
- Toggle button in header/hero
- All static text goes through `t()` — no hardcoded English strings in JSX

## Key UX Principles

1. **Mobile-first** — design for 360px width first, expand up
2. **Forgiving inputs** — auto-format phone numbers (allow any format, strip to digits), auto-format KES inputs with commas
3. **Loading states** — every button shows spinner during API call, every list shows skeleton while loading
4. **Error states** — inline error messages, never silent failures, retry buttons where appropriate
5. **Empty states** — helpful illustration/message when lists are empty ("No donations yet. Be the first!")
6. **Confirmations** — "Are you sure?" before any destructive action
7. **Success feedback** — brief success message/checkmark after every successful action
8. **Offline awareness** — show a subtle banner when network is offline
9. **Large touch targets** — minimum 44x44px for all interactive elements
10. **Readable fonts** — no font smaller than 12px, good contrast ratios

## What NOT to Change

- Backend (`server/` directory) — do NOT touch any server code
- API endpoints — do NOT change the API interface
- Database schema — no migrations
- Environment variables — no new env vars
- Build/deploy config — `vite.config.ts`, `vercel.json`, `tsconfig.json` stay as-is
- Package.json dependencies — don't add new packages unless necessary

## Deliverable

A complete `src/` directory with:
1. All page components
2. All reusable UI components (Button, Input, Card, Modal, Table, ProgressBar, etc.)
3. API client library with all endpoint wrappers
4. Types/interfaces file
5. i18n translations (English + Swahili)
6. Auth context + language context
7. App.tsx with router setup
8. index.css with Tailwind theme

Each component must be in its own file with a clear name. No overly nested directory structures. Keep it flat where possible.

The result should be a drop-in replacement for the current `src/` that works with the existing backend.
