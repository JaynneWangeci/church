# Figma AI Prompt — AIPC Harambee Mobile App

## Overview

A living, breathing 3D interactive church community app for iOS + Android. Every surface breathes, every card floats, every transition feels organic — like stepping into a warm, living sanctuary through the phone screen.

---

## Brand & Design System

### Brand Essence
- **Vibe**: Warm, sacred, alive, generous, African spirit
- **Tone**: Golden-hour light, amber glow, deep warm browns, cream parchment
- **Experience**: Walking into a sunlit cathedral — stained glass light, warm wood, flickering candles

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--gold` | `#C4964A` | Primary — CTAs, active states, accent glows |
| `--gold-light` | `#E2C07A` | Hover, highlights, shimmer overlays |
| `--gold-dark` | `#9A7538` | Pressed states, shadows |
| `--cream` | `#FFF8F0` | Backgrounds, cards base |
| `--warm-ink` | `#2C1810` | Primary text — deep espresso |
| `--warm-muted` | `#8B7355` | Secondary text, metadata |
| `--ember` | `#E85D3A` | Urgency, alerts, heat accent |
| `--forest` | `#2D5016` | Success, nature, growth |
| `--deep-navy` | `#1A1A2E` | Dark mode base |
| `--warm-charcoal` | `#2D2D2D` | Dark mode surfaces |

### 3D Lighting Model
- **Light source**: Top-left golden hour (warm amber, 45° angle)
- **Ambient**: Soft cream wrap-light, 30% intensity
- **Rim light**: Subtle warm glow on card edges, 15% opacity
- **Shadow**: Warm-tinted dropshadow (rgba(156, 115, 55, 0.25))
- **Specular**: Gold microfacet highlights on interactive elements

### Typography
- **Display**: "Instrument Serif" — for hero numbers, large headings (weight 700, letter-spacing -0.02em)
- **Body**: "Inter" — clean, warm readability (weight 400/500/600/700)
- **Monospace**: "JetBrains Mono" — donation amounts, KES values (weight 500, tabular-nums)
- **Size scale**: 10 / 12 / 14 / 16 / 18 / 24 / 32 / 48 / 64

### Iconography
- **Set**: Lucide icons, 24x24 default
- **Style**: Outlined, rounded caps (stroke-width 1.5, round joins)
- **3D variant**: Icons gain subtle depth on active state (inner shadow, 1px offset)

### Spacing Scale
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80

### Corner Radius
- **Cards**: 16px (with subtle 3D bevel)
- **Buttons**: 12px (pill-style = 999px for primary)
- **Modals**: 20px top, 12px bottom
- **Inputs**: 10px

---

## 3D Interaction System

Every element responds to touch with physicality:

### 1. Nudge (Light Press)
- **Trigger**: Finger lands on element
- **Animation**: Element depresses 2px on Z-axis, scale 0.97
- **Shadow**: Deepens (y-offset += 4px, blur += 6px)
- **Duration**: 80ms, ease-out
- **Sound (haptic)**: Light thud (iOS light impact, Android tick)

### 2. Confirm (Full Press + Release)
- **Trigger**: Press + release within bounds
- **Animation**: Depress then spring back to 1.0, overflow bounce 1.05
- **Shadow**: Squash frame (y-offset shrinks 50% at peak press)
- **Duration**: 200ms spring (stiffness 180, damping 15)
- **Haptic**: Medium impact (iOS medium, Android thud)

### 3. Lift (Hover/Float)
- **Trigger**: Content approaches thumb zone / swiped near
- **Animation**: Card lifts 6px on Z, glow rim appears
- **Shadow**: Expands, becomes warmer tint
- **Duration**: 300ms, ease-smooth

### 4. Ripple (Touch Ripple)
- **Trigger**: Any press on solid surface
- **Effect**: Circular ripple from contact point, gold-to-transparent
- **Duration**: 400ms, ease-out exponential

### 5. Magnetic Snap
- **Trigger**: Draggable element near snap point
- **Effect**: Element accelerates toward snap target with rubber-band overshoot
- **Duration**: 250ms spring

### 6. Breathing (Idle)
- **Trigger**: Page idle >2s
- **Effect**: Hero elements gently pulse 0.5% scale on 4s sine loop
- **Glow**: Gold shimmer sweep across primary CTA every 6s, 2s duration
- **Particle**: Floating amber specks slowly drift upward (15s loop, 20px variance)

---

## Screen-by-Screen Design

### 1. Splash → Onboarding (3 Screens)

**Splash (2s)**
- 3D golden cross emblem rotates slowly into view (Y-axis, 360° over 1.5s, ease-spring)
- Warm amber gradient radiates from center outward
- "AIPC Harambee" text fades in with letter-spacing expand (0 → 0.08em, 600ms)
- Subtitle "Give. Grow. Gather." types out character by character (50ms stagger)
- Bottom 10%: pulsing "Tap to begin" with breathing animation
- Background: subtle parallax of African savanna sunset (3D depth layers)

**Onboarding 1: "Give"**
- 3D floating coin stack on left, slowly rotates
- "Your contribution builds" headline with gradient gold fill
- Subtext: "Every shilling, a seed planted"
- Illustration: hand holding coin, coin has 3D gold material with light refraction
- Bottom: progress dots (3 dots, current glows), "Next" button with arrow morph

**Onboarding 2: "Grow"**
- 3D sprouting plant from donation pot, leaves unfurl (CSS keyframe 2s loop)
- "Watch your fellowship flourish"
- Particle effects: small gold orbs float upward from plant
- Background gradient shifts slightly warmer

**Onboarding 3: "Gather"**
- 3D interconnected nodes representing fellowship members, subtle pulse between connections
- "Together we rise" — each word appears with scale bounce 0.8→1.0
- "Get Started" button — large, pill, gold gradient, 3D bevel edge

---

### 2. Home / Landing

**Header (Parallax Hero)**
- Background: full-bleed photo of congregation (or warm gradient fallback)
- Overlay: gradient black→transparent (top 0% → bottom 60%)
- "AIPC Harambee" title in white, Instrument Serif
- Running total: large 3D flip-counter (each digit flips on Z-axis when number changes)
  - Gold gradient text fill
  - "KES 0,000,000" with smooth count-up on load (2s ease-out)
- Tagline: "Faith in action" — serif italic, gold

**3D Progress Ring**
- Below header: circular progress ring (SVG stroke-dasharray animated)
- Shows campaign progress (e.g., "72% of 5M goal")
- Ring has 3D bevel edge, gold gradient stroke
- Inner circle shows: "KES 3.6M / KES 5M"
- Micro-animation: ring fills on scroll (tied to page scroll position)

**Stats Row (3 Cards, Floating)**
- 3 cards side by side:
  1. "Total Donors" — with upward-trending 3D bar chart mini
  2. "Active Fellowships" — with connected dot network mini
  3. "This Week" — with sparkline graph
- Each card: floating 3D plane with warm shadow, lifts on touch
- Background: frosted glass (backdrop-blur, cream tint)

**Pledge CTA Card**
- Full-width golden card with 3D folded corner (isometric fold, shadow cast)
- "Make a Pledge" headline
- "Commit to give regularly" subtext
- Button: "Pledge Now" with shimmer sweep animation
- Secondary: "See all pledges"

**Fellowship Progress Section**
- Horizontal scrollable list of fellowship cards
- Each card: 3D tilted card (5° perspective rotate on Y)
  - Fellowship name, member count, raised amount
  - Mini progress bar (3D tube fill, gold gradient)
  - Avatar stack of top members
- Scroll behavior: cards respond to scroll position with parallax (cards at edge tilt more)
- Active card: elevated 8px, golden glow rim

**Gender Contribution (Men vs Women)**
- Two horizontal progress bars side by side
- Each bar: 3D pill shape with inner glow
- Gold fill for leading, warm beige for trailing
- "Men Leading" / "Women Leading" badge above (pulsing crown icon if leading)
- Percentage labels with 2 decimal places

**About Section (Collapsible)**
- Accordion with 3D fold animation (panel unfolds in 3D space, origin center)
- Church name, vision, mission
- Contact: phone, email, location with 3D map pin icon

**Bottom Navigation Bar**
- 5 tabs: Home, Donate, Pledges, Fellowship, More
- Active tab: icon lifts 4px, gold glow halo underneath, label scale 1.05
- Inactive: warm gray, subtle
- Bar itself: frosted glass (backdrop-blur-xl), floating above content
- Safe area: respects iOS/Android bottom insets

---

### 3. Donate Screen

**Hero Section**
- 3D coin/cash material banner at top (gold surface with light refraction)
- "Donate" title with letter-spacing animation on mount
- Campaign selector: horizontal pill carousel with 3D flip transition

**Quick Amount Cards (3D Grid)**
- 6 preset amounts: 100, 500, 1000, 2000, 5000, 10000
- Each card: 3D floating tile, gold gradient border on selected
- Selection animation: card flips on Z (brief 180° showing checkmark on back)
- Selected card: elevated, heavier shadow, gold border glow, scale 1.05
- Unselected: flat, warm cream bg
- Custom amount input: expands from inline "Other" button

**Donor Information Form**
- Input fields with 3D raised borders (inner shadow + bottom shadow for depth)
- Focus: border turns gold, label floats upward, subtle 2px lift
- Name field: auto-capitalize with character-by-character glow
- Phone field: Kenyan format mask (+254 XXX XXX XXX)
- Fellowship dropdown: 3D rotating wheel selector on iOS, bottom sheet on Android

**Honour System**
- "Give in honour of" toggle: flip switch with 3D toggle track
- On toggle: expands inline member search
- Search results: 3D cards with floating avatars
- Selected member: golden checkmark overlay, card elevates

**Payment Method Selector**
- Two large 3D cards: M-Pesa / Airtel Money
- Selected: card tilts slightly forward, golden edge glow, checkmark
- Each card shows logo with 3D depth, method name, typical processing time badge
- M-Pesa STK prompt simulation: 3D phone mockup with incoming STK animation

**Submit Button**
- Large pill, gold gradient, 3D bevel
- Text: "Donate KES X,XXX"
- Press: 3D squash (scale 0.95, shadow reduces 50%)
- Loading: button transforms to 3D spinning coin (coin with cross on side, rotates on Y-axis)
- Success: button expands to full-width green card with checkmark + confetti particles

---

### 4. Pledges Screen

**Header**
- "My Pledges" with running total badge (floating 3D pill above header)
- "Active Pledges" count with breathing indicator dot

**Pledge Cards (Vertical Scroll)**
- Each pledge: 3D layered card
  - Top layer: fellowship name, amount, frequency badge
  - Middle layer: progress bar (3D tube gold fill) with percentage
  - Bottom layer: paid / remaining split with mini pie chart (3D extruded)
- Swipe right: "Pay Now" quick action (button slides in from right with spring)
- Swipe left: "Remind Me" (bell icon with shake animation)
- Long press: reorder (card lifts 12px, haptic feedback)

**New Pledge FAB**
- Floating gold button, bottom right
- 3D layered circle with "+" inside spinning ring
- Tap: bottom sheet rises with spring animation (sheet has 3D folded top edge)
- Sheet content: amount, frequency (daily/weekly/monthly, each with 3D toggle), fellowship, message

**Pledge History**
- Collapsible accordion at bottom
- Each entry: timeline-style with 3D dot on timeline
- "Fulfilled" / "Active" / "Missed" status with color-coded 3D badges

---

### 5. Fellowship Screen

**Header**
- "Our Fellowships" with network visualization background (animated connections)
- Total members count with 3D counter

**Fellowship Grid (2-column)**
- Each card:
  - 3D tilted photo (5° perspective, random subtle rotation for organic feel)
  - Overlay gradient bottom→top for text readability
  - Fellowship name, member count, raised amount
  - "You're in this" badge if member (3D pin with golden glow)
- Tap: card unfolds forward (3D flip reveal) with details

**Fellowship Detail (Drill-down)**
- Hero: fellowship photo with parallax layers
- Stats row: members, raised, rank
- Top Donors: scrollable table with rank, name, phone, amount (all 3D rows)
  - Each row: subtle 3D bevel, alternating cream/white
  - Rank number in gold 3D badge (1st/2nd/3rd have special gold/silver/bronze)
- Pledge summary: total pledged, fulfillment rate
- Members grid: avatars with 3D hover lift, tap for profile

---

### 6. More (Profile/Settings)

**Profile Card**
- 3D layered card at top
- Avatar with golden ring border (3D torus)
- Name, fellowship, member since
- Stats: donations count, total given, rank

**Menu Items**
- Each row: 3D raised cell with icon, label, chevron
- Tap: cell depresses 2px, then navigates
- Settings: toggles with 3D flip track
- About: animated church crest with 3D rotation
- Share app: share sheet with platform-appropriate animation

---

## Shared Components & Micro-interactions

### Cards
- **Default**: floating 3D plane (y-offset 2px of perspective), warm shadow
- **Elevated**: y-offset 6px, gold rim glow (box-shadow with gold tint spread 2px)
- **Pressed**: y-offset 0px, scale 0.97, shadow reduced
- **Loading**: shimmer skeleton (gold gradient sweep, 1.5s loop)

### Buttons
- **Primary**: gold gradient, 3D bevel (top edge lighter, bottom edge darker), pill radius
  - Idle: subtle gold shimmer sweep every 4s
  - Hover: lift 2px, glow increase 20%
  - Press: squash (scale 0.95), shadow shrink
  - Disabled: flat warm gray, no depth
- **Secondary**: outlined, gold border, transparent interior
  - Idle: border with subtle inner glow
  - Press: fill with gold at 10% opacity
- **Ghost**: no border, text only
  - Press: text darkens, no movement
- **Icon**: circular, 40px, frosted glass
  - Press: circular ripple from center

### Navigation
- **Bottom Tab Bar**: frosted glass, floating 4px above content
  - Active icon: 3D lift with gold glow, label scales 1.05
  - Inactive: warm gray, opacity 0.6
  - Badge: 3D pill with count, gold fill, pulse if >0
- **Back Button**: 3D arrow with stem morph animation (arrow → chevron on press)

### Progress Bars
- **3D Tube**: rounded pill, gold gradient fill, inner highlight for glass tube effect
  - Leading percentage badge: floating above bar with connecting line
  - Animation: fills left-to-right with ripple wave at leading edge

### Modals & Sheets
- **Bottom Sheet**: rises with spring (damping 0.8, stiffness 200)
  - Handle: 3D pill drag indicator
  - Content: staggered fade-in (children appear with 50ms delay each)
  - Dismiss: drag down with rubber-band resistance, snap close below 40% threshold
- **Alert**: centered 3D card with backdrop blur
  - Entry: scale 0.8→1.0 with spring, backdrop fades 0→1
  - Buttons: side by side with gap

### Loading States
- **Page Load**: skeleton shimmer with warm cream + gold gradient sweep
- **Action Load**: button transforms to spinner (3D rotating coin or ring)
- **Pull to Refresh**: gold circular progress ring with 3D bevel
- **Infinite Scroll**: bottom indicator with bouncing 3D dots (gold, staggered scale)

### Empty States
- 3D illustration: empty donation box with soft glow
- "No donations yet" — warm message with encouraging subtext
- CTA: "Be the first to give" button

### Error States
- Toast: slides from top, red (ember) left border with 3D bevel
- Icon: alert triangle with gentle shake
- Auto-dismiss: 3s, slides back with ease-in
- Offline: persistent banner at top, amber warning color, wifi icon with disconnect animation

---

## Motion Design System

### Transition Types

| Transition | Duration | Easing | Use |
|------------|----------|--------|-----|
| Page Push | 350ms | cubic-bezier(0.22, 1, 0.36, 1) | Forward navigation |
| Page Pop | 300ms | cubic-bezier(0.22, 1, 0.36, 1) | Back navigation |
| Modal Rise | 400ms | spring(0.8, 200) | Bottom sheets |
| Fade | 200ms | ease-out | Overlay, backdrop |
| Stagger | 50ms delay | — | List children appear |
| Scale Bounce | 300ms | spring(0.6, 150) | Badge count, checkmark |
| Flip | 500ms | ease-in-out | Tab switch (carousel) |

### Scroll-Driven Animations
- Parallax: hero content moves at 0.7x scroll speed
- Scale: cards near viewport center grow 1.0→1.02 at center→edges
- Fade in: cards fade + lift (y 20px→0) as they enter viewport, 600ms, staggered 80ms
- Progress ring: fills proportionally to scroll depth on landing page

### Gesture Responses
- **Swipe back (iOS)**: follow finger with resistance, snap to close >30% threshold
- **Pull to refresh**: tension-based resistance, release triggers refresh with spring return
- **Tap ripple**: originates at finger contact point, not center
- **Long press**: 400ms vibration feedback, then context menu appears with scale-in
- **Drag**: element follows finger with 1:1 mapping, release with velocity throw

---

## Platform-Specific Notes

### iOS (Human Interface Guidelines)
- Safe areas: 44pt top, 34pt bottom (Dynamic Island), 16pt sides
- Navigation: standard back swipe gesture
- Sheet: interactive dismiss with drag
- Haptics: UIImpactFeedbackGenerator (light/medium/heavy)
- Font: San Francisco fallback for system text
- Keyboard: number pad with "Done" toolbar for amount fields
- Status bar: light content on dark hero, dark content on cream sections

### Android (Material Design 3)
- Safe areas: status bar height 24dp, navigation bar 48dp
- Navigation: back button in header OR system back gesture
- Haptics: HapticFeedbackConstants (clock tick, contextual click)
- Font: Roboto fallback for system text
- Keyboard: number input type with comma/period for amount
- Ripple: use RippleDrawable with gold color (#C4964A at 20% opacity)
- Edge-to-edge: draw behind system bars with insets handling

---

## Accessibility

- **Reduced Motion**: respect `prefers-reduced-motion`, replace animations with crossfade (0.3s only)
- **Touch targets**: minimum 44x44pt (48dp Android) for all interactive elements
- **Contrast**: all text meets WCAG AA (4.5:1 normal, 3:1 large)
- **Focus indicators**: 2px gold outline with 4px offset on keyboard focus
- **Screen Reader**: all icons have aria-labels, progress values announced
- **Font scaling**: Dynamic Type (iOS) / Accessibility (Android) up to 200%
- **Color not sole indicator**: use icons + labels alongside color for status/roles

---

## Content Structure (Pages & Routes)

```
/                     → Home (Landing)
/splash               → Splash → Onboarding (first launch only)
/donate               → Donate screen with amount, form, payment
/pledges              → Pledge list + create
/fellowship           → Fellowship grid
/fellowship/:id       → Fellowship detail (donor list, members, stats)
/more                 → Profile, settings, about
/admin                → Admin dashboard (9 tabs, separate responsive layout)
```

---

## Figma-Specific Instructions

Use these settings in Figma when generating:

1. **Device frame**: iPhone 15 Pro Max + Pixel 8 Pro side by side
2. **Background**: warm cream (#FFF8F0) for light, warm charcoal (#2D2D2D) for dark
3. **3D effect technique**: layered shadows + inner shadows to simulate Z-depth (no actual 3D rendering needed in Figma — use 4-5 shadow layers per card)
4. **Gradients**: 45° angle for all gold gradients, warm amber-to-gold
5. **Blur**: 20px backdrop-blur for glass elements
6. **Animations**: mark with red dashed border + motion label describing the animation
7. **Prototype links**: connect screens with "Smart Animate" using the transition table above
8. **Variants**: create component variants for idle/hover/pressed/disabled/loading
9. **Auto Layout**: use Auto Layout with 16px padding, 12px gap for consistent spacing
10. **Export**: 3x export for all icons and illustrations
