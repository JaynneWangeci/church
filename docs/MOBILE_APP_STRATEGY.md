# AIPCA Bahati Cathedral — Mobile App Strategy

**Date:** 22 June 2026  
**Purpose:** Brainstoming & feasibility analysis for Play Store / App Store distribution

---

## Why Go Mobile?

| Reason | Detail |
|---|---|
| Offline access | Donors view progress without internet? (No — app still needs data) |
| Push notifications | Direct pledge reminders, payment confirmations, harambee updates |
| M-Pesa deep linking | Open M-Pesa STK Push directly from app |
| Home screen presence | Brand stays on user's phone (PWA already does this) |
| Church directory | Member directory with instant WhatsApp call |
| Admin on mobile | Treasurer approves pledges, views analytics from phone |
| Giving frequency | Mobile apps convert 3× better than mobile web |

---

## Option 1: PWA (Current + Enhancements) ⭐ RECOMMENDED

**What we already have:**
- Fully responsive mobile web app
- Works on all browsers
- Can be added to home screen ("Add to Home Screen")

**What we add:**
- Service worker for offline shell
- Push notifications (via Web Push API)
- Install prompt
- Background sync for pledges

**Cost:** KES 30,000–50,000 (3–5 days work)  
**Timeline:** 1 week  
**No App Store review needed**  
**No 30% Apple/Google cut on donations**

### Implementation

```
Current App → Add manifest.json → Service Worker → Push API
                         ↓
               Installable PWA
                         ↓
               Google Play (Trusted Web Activity) — optional
               Apple App Store (WkWebView wrapper) — optional
```

---

## Option 2: React Native / Expo (Native App)

**Build from scratch OR wrap existing web app in WebView**

### 2a. WebView Wrapper (Low Effort)

```
React web app → Capacitor / Cordova wrapper → APK / IPA
                         ↓
               Push notifications via Firebase
               M-Pesa SDK integration
```

| Pros | Cons |
|---|---|
| Reuse all existing code | WebView performance |
| 1–2 weeks to ship | No native feel |
| Push notifications | Limited offline |
| Direct Play Store listing | Apple review required |

**Cost:** KES 80,000–120,000 (2–3 weeks)  
**Store fees:** Google $25 one-time, Apple $99/year

### 2b. Full React Native (High Effort)

| Pros | Cons |
|---|---|
| Native performance | Rewrite entire UI |
| Offline-first | 2–3 months development |
| M-Pesa native SDK | KES 400,000–700,000 cost |
| Apple/Google Pay | Need separate dev account |
| Biometric auth (fingerprint) | |
| Camera (QR for payments) | |

**Cost:** KES 400,000–700,000 (2–3 months)

---

## Option 3: Progressive Enhancement (Recommended Path)

```
Phase 1 (Now):  PWA enhancements → push notifications, install prompt
                Budget: KES 40,000 | Timeline: 1 week

Phase 2 (Q3):   Capacitor wrapper → APK for Google Play
                Budget: KES 80,000 | Timeline: 2 weeks

Phase 3 (Q4):   iOS via Capacitor + Apple Developer account
                Budget: KES 50,000 + $99/yr | Timeline: 1 week

Phase 4 (2027): Native features → biometrics, offline, M-Pesa SDK
                Budget: KES 150,000 | Timeline: 3 weeks
```

---

## Revenue Model for App

| Source | How |
|---|---|
| App is FREE | No charge to download |
| Donations via app | M-Pesa STK Push (same as web) |
| In-app honour | "I'm giving for [name]" — drives engagement |
| WhatsApp sharing | Viral loop: "I just gave KES 1,000 to..." |

---

## Technical Considerations

| Feature | Web (Current) | PWA | Native |
|---|---|---|---|
| M-Pesa STK Push | ✅ Working | ✅ Same | ✅ Native SDK |
| Push notifications | ❌ | ✅ Web Push API | ✅ FCM / APNs |
| Offline access | ❌ | ✅ Shell only | ✅ Full |
| Biometric auth | ❌ | ❌ | ✅ Face ID / Fingerprint |
| Home screen icon | ✅ Add to Home Screen | ✅ Auto-prompt | ✅ App icon |
| App Store presence | ❌ | ✅ Via TWA/WkWebView | ✅ Direct |
| Share progress | ✅ Web Share API | ✅ Same | ✅ Native share |
| Auto-update | ✅ Always latest | ✅ Always latest | ❌ App Store review |
| Development cost | ✅ Already built | KES 40K | KES 400K–700K |

---

## Recommendation

**Phase 1 immediately:** Enhance the current PWA
- Add `manifest.json` with proper icons (already partially done)
- Add service worker for basic offline support
- Add Web Push notifications for pledge reminders
- This costs ~KES 40,000 and takes 1 week

**Why not native yet?**
- The web app already handles 95% of use cases
- M-Pesa STK Push works identically on mobile web
- App Store takes 30% of donations if processed through IAP
- Your donor base uses WhatsApp web more than app stores
- A PWA listed on Google Play via TWA costs 1/10th of native

**When to go native:**
- When you have 500+ recurring donors
- When offline access becomes critical
- When you need M-Pesa express (direct SIM) integration
- When the board wants "an app in the Play Store"

---

## Next Steps

1. ✅ **Done:** Mobile-responsive web app
2. ⏳ **This week:** Fix PWA manifest + icons (KES 10K)
3. 📅 **Next month:** Push notifications via Web Push (KES 30K)
4. 📅 **Q3 2026:** Google Play via Bubblewrap/TWA (KES 80K)
5. 📅 **Q4 2026:** iOS App Store via Capacitor (KES 50K)

---

**I recommend we do Phase 1 immediately (KES 40K), then reassess after 3 months of donor growth data.**
