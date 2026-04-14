# 🌊 Smart Water — Figma UI Design Specification

> **Project:** Smart Water Management & Monitoring System  
> **Version:** 1.0  
> **Purpose:** Complete design handoff document for Figma — elevate the UI from "AI-generated" to **premium, gradient-rich, and elegant**

---

## 1. Brand Identity

| Property | Value |
|---|---|
| Product name | **AquaOS** / Smart Water |
| Tagline | *Intelligent Water Intelligence* |
| Personality | Technical · Calm · Trustworthy · Futuristic |
| Visual mood | Deep ocean at night — dark navy canvas with glowing aqua-teal accents |

---

## 2. Color System

### 2.1 Background Layers

These stack to create depth. Always work **darkest to lightest** going from canvas → surface → card → element.

| Token | Hex / RGBA | Use |
|---|---|---|
| `bg` | `#020C1B` | App canvas, outermost shell |
| `surface-1` | `rgba(4,18,38, 0.90)` | Primary panels, sidebar |
| `surface-2` | `rgba(6,22,45, 0.75)` | Secondary cards |
| `surface-3` | `rgba(10,28,55, 0.60)` | Nested containers |

> [!TIP]
> In Figma, create these as **Fill Styles** with opacity set directly on the fill (not the layer). This ensures backdrop-filter blur effects are reflected correctly.

### 2.2 Brand Accent Colors

| Token | Hex | Role |
|---|---|---|
| `cyan` | `#00D4FF` | Primary active / interactive / links |
| `teal` | `#00E5B0` | Success / live status / savings |
| `purple` | `#A78BFA` | AI / machine-learning elements |
| `amber` | `#FBBF24` | Warnings / peak usage |
| `rose` | `#FB7185` | Errors / critical alerts |

### 2.3 Dim (Tinted Fill) Variants

Used for badge backgrounds, highlighted row fills, and inner glow washes:

| Base color | Dim fill | Used on |
|---|---|---|
| Cyan | `rgba(0,212,255, 0.12)` | Info badges, chip backgrounds |
| Teal | `rgba(0,229,176, 0.12)` | OK/live badges |
| Purple | `rgba(167,139,250, 0.12)` | AI badges, thinking state |
| Amber | `rgba(251,191,36, 0.12)` | Warning badges |
| Rose | `rgba(251,113,133, 0.12)` | Error badges |

### 2.4 Text Colors

| Token | RGBA | Use |
|---|---|---|
| `text` | `#E2EEFF` | Primary body text |
| `text-2` | `rgba(180,210,240, 0.65)` | Secondary labels |
| `text-3` | `rgba(130,170,210, 0.40)` | Tertiary / placeholder / meta |

### 2.5 Glass System Colors

| Token | RGBA | Use |
|---|---|---|
| `glass-bg` | `rgba(255,255,255, 0.035)` | Card fill |
| `glass-border` | `rgba(255,255,255, 0.08)` | Card outline |
| `glass-hover` | `rgba(255,255,255, 0.06)` | Hovered card fill |
| `border` | `rgba(0,212,255, 0.10)` | Default interactive border |
| `border-hover` | `rgba(0,212,255, 0.28)` | Hovered interactive border |

---

## 3. Gradient Recipes 🎨

This is the most important section. Every gradient here must be precisely reproduced in Figma.

### 3.1 Background Ambient Blobs

Create **3 ellipse layers** behind everything, set to **Blur: 80px**, **Opacity as specified**.

| Blob | Size | Position | Gradient | Opacity | Animation Hint |
|---|---|---|---|---|---|
| Blob 1 (Cyan) | 600×600 px | Top-left (offset -150,-100) | Radial: `#00D4FF` → `#0040FF` → transparent | 18% | Slow drift, ~18s |
| Blob 2 (Teal) | 500×500 px | Bottom-right (offset -100,-80) | Radial: `#00E5B0` → `#0066CC` → transparent | 18% | Slow drift, ~22s |
| Blob 3 (Purple) | 400×400 px | Center-left-ish | Radial: `#A78BFA` → `#7C3AED` → transparent | 10% | Very slow, ~26s |

### 3.2 Grid Overlay

On top of blobs, add a **full-screen frame** with a **Line Pattern Fill**:
- Line color: `rgba(0,212,255, 0.03)`
- Grid cell: 56×56 px (both horizontal and vertical)
- Layer blend: Normal

### 3.3 Logo Text Gradient

```
Direction: 135°
Stop 1 (0%):   #FFFFFF
Stop 2 (50%):  #00D4FF  (Cyan)
Stop 3 (100%): #00E5B0  (Teal)
Applied as: Clip-to-text fill
```

### 3.4 KPI Accent Bar Gradients

Each KPI card has a 2px top border that acts as a colored accent stripe. Use these:

| KPI | Gradient |
|---|---|
| Total Consumption | `90°: #00D4FF → #0066FF` |
| Smart Reuse | `90°: #00E5B0 → #00D4FF` |
| Daily Peak | `90°: #FBBF24 → #FB7185` |
| Cost Saved | `90°: #A78BFA → #00D4FF` |
| Efficiency | `90°: #00E5B0 → #A78BFA` |

### 3.5 Bar Chart Fill

Bars in the Live Telemetry chart use:
```
Direction: 180° (top → bottom)
Stop 1 (0%):   #00D4FF
Stop 2 (100%): rgba(0,212,255, 0.30)
```

### 3.6 Day Usage Bar (Peak day highlighted)

Normal bars:
```
Direction: 180°
Stop 1: #A78BFA | Stop 2: rgba(167,139,250, 0.30)
```

Peak day bar:
```
Direction: 180°
Stop 1: #FBBF24 | Stop 2: rgba(251,191,36, 0.30)
Drop shadow: 0px 0px 10px rgba(251,191,36, 0.30)
```

### 3.7 Savings Progress Bar

```
Direction: 90°
Stop 1: #00E5B0 (Teal)
Stop 2: #00D4FF (Cyan)
Drop shadow: 0px 0px 12px rgba(0,229,176, 0.40)
```

### 3.8 Glass Card Inner Highlight

Each glass card has a subtle inner gradient (creates the premium glass illusion):
```
Direction: 135°
Stop 1 (0%):   rgba(255,255,255, 0.04)
Stop 2 (60%):  transparent
Applied as overlay inside card bounds
```

---

## 4. Typography

### 4.1 Font Families

| Role | Font | Source |
|---|---|---|
| Body / UI | **Inter** | Google Fonts |
| Numbers / Code | **JetBrains Mono** | Google Fonts |

> [!IMPORTANT]
> Import both fonts in Figma via **Plugins → Google Fonts** or the native font picker. Do NOT substitute with system fonts.

### 4.2 Type Scale

| Level | Font | Weight | Size | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|---|
| Logo | Inter | 700 | 17px | auto | -0.3px | Brand name |
| Page Title | Inter | 700 | 24px | 1.2 | -0.5px | Section headings |
| Card Title | Inter | 600 | 13px | 1.3 | 0 | Card headers |
| Card Subtitle | Inter | 400 | 10px | 1.4 | 0 | Secondary header labels |
| Body | Inter | 400 | 11.5–12px | 1.5 | 0 | Insight text, descriptions |
| Label | Inter | 500 | 11px | 1.4 | 0 | Form labels, stat labels |
| Meta / Caption | Inter | 500 | 9–10px | 1.3 | +2.5px | Overlines, section headers |
| KPI Value | JetBrains Mono | 700 | 26px | 1 | -1px | Key metric numbers |
| Stat Value | JetBrains Mono | 600 | 15–18px | 1 | 0 | Secondary numbers |
| Code / Monospace | JetBrains Mono | 400–500 | 10–13px | 1.4 | +0.5px | Clock, IDs, debug info |
| Badge | Inter | 600 | 9–10px | 1 | +0.3–1px | Chips, labels, overlines |

---

## 5. Spacing & Sizing Tokens

### 5.1 Border Radius

| Token | Value | Applied to |
|---|---|---|
| `r-xs` | 6px | Small badges, scrollbars |
| `r-sm` | 10px | Buttons, icon containers, pills |
| `r-md` | 14px | Cards, KPI tiles |
| `r-lg` | 20px | Large panels |
| `r-xl` | 28px | Full-bleed feature sections |
| `r-full` | 999px | Status pills, circular chips |

### 5.2 Spacing Scale

Base unit: **4px**

| Token | Value |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |

### 5.3 Shadows / Elevation

| Token | Value |
|---|---|
| `sh-card` | `0 4px 24px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.08)` |
| `sh-lifted` | `0 16px 48px rgba(0,0,0,0.60), 0 1px 0 rgba(255,255,255,0.10)` |
| Cyan glow | `0 0 28px rgba(0,212,255, 0.45)` |
| Teal glow | `0 0 28px rgba(0,229,176, 0.40)` |
| Purple glow | `0 0 28px rgba(167,139,250, 0.40)` |
| Amber glow | `0 0 28px rgba(251,191,36, 0.35)` |
| Rose glow | `0 0 28px rgba(251,113,133, 0.35)` |

---

## 6. Component Specifications

### 6.1 App Header

```
Height: 58px
Background: rgba(2,12,27, 0.85)  +  Blur: 24px
Bottom border: 1px solid rgba(255,255,255, 0.08)
Padding: 0 24px
Layout: Horizontal flex — Logo | Divider | Status Pills | (flex spacer) | Clock | Alert
```

**Logo area (left):**
- Container: 34×34px circle with rotating dashed border (1.5px, cyan 40%)
- SVG droplet icon with cyan drop shadow
- Brand name: gradient text (see §3.3)
- Tag below name: `SMART WATER` in 9px uppercase, letter-spacing 2px, `text-3` color

**Status Pills (center-left):**  
Three pills side by side — `MongoDB`, `Cloudflare AI`, `Firebase Auth`

```
Pill background: glass-bg
Pill border: glass-border
Padding: 4px 10px
Border-radius: 999px
Font: Inter 11px / 500
```

Status dot variants:
- `ok` = `#00E5B0` with `box-shadow: 0 0 8px #00E5B0` + pulse animation
- `warn` = `#FBBF24` with `box-shadow: 0 0 8px #FBBF24`
- `off` = `#FB7185` with `box-shadow: 0 0 8px #FB7185`

**Right side:**
- Clock: `JetBrains Mono 13px`, glass background, border, 4px 10px padding, `border-radius: r-xs`
- Alert button: 34×34px, `r-sm`, glass bg + border; on hover: cyan glow shadow; red badge dot (7×7px, rose color)

---

### 6.2 Sidebar

```
Width: 224px
Background: rgba(2,10,22, 0.70)  +  Blur: 20px
Right border: 1px solid glass-border
Padding: 16px 0 20px
```

**Section Label:**
```
Font: Inter 9px / 600
Letter-spacing: 2.5px
Transform: UPPERCASE
Color: text-3
Padding: 0 16px 8px
```

**Module Item (nav row):**
```
Padding: 8px 14px
Margin: 1px 8px
Border-radius: r-sm
Layout: [mono-number 22px] [icon 20px] [label, truncated] [badge auto]
```

States:
- Default: No background
- Hover: `glass-hover` fill
- **Active: `rgba(0,212,255, 0.08)` fill + `1px solid rgba(0,212,255, 0.20)` border + `0 0 16px rgba(0,212,255,0.05)` shadow**

Badge types:
| Class | Background | Text |
|---|---|---|
| LIVE | `rgba(0,229,176, 0.15)` | `#00E5B0` |
| AI | `rgba(167,139,250, 0.15)` | `#A78BFA` |
| NEW | `rgba(0,212,255, 0.15)` | `#00D4FF` |

**Footer:**
- Pinned to bottom of sidebar
- Top border: `1px solid glass-border`
- Text: `JetBrains Mono 10px`, `text-3` color
- Content: build hash / version string

---

### 6.3 Glass Card (base component)

```
Background: rgba(255,255,255, 0.035)
Blur: 20px
Border: 1px solid rgba(255,255,255, 0.08)
Border-radius: r-md (14px)
Shadow: sh-card
Overflow: hidden

Inner overlay (pseudo):
  Fill: linear-gradient(135°, rgba(255,255,255,0.03) 0%, transparent 70%)
  Pointer-events: none
```

**Card Header:**
```
Padding: 14px 18px 12px
Bottom border: 1px solid rgba(255,255,255, 0.05)
Layout: [icon + title/subtitle] | (flex-end: chips/actions)
```

**Card Body:**
```
Padding: 14px 18px
```

**Card Chips / Badges:**
```
Font: Inter 10px / 600
Padding: 3px 8px
Border-radius: 999px (full pill)
Border: 1px solid (color-specific)
Letter-spacing: 0.3px
```

Chip variants:
| Name | Text color | Border | Background |
|---|---|---|---|
| LIVE | `#00E5B0` | `rgba(0,229,176, 0.30)` | `rgba(0,229,176, 0.06)` |
| AI | `#A78BFA` | `rgba(167,139,250, 0.30)` | `rgba(167,139,250, 0.06)` |
| REPORT | `#00D4FF` | `rgba(0,212,255, 0.30)` | `rgba(0,212,255, 0.06)` |

**Hover state:**
- Border: `border-hover` (`rgba(0,212,255, 0.28)`)
- Shadow: `sh-lifted`

---

### 6.4 KPI Card

Extends Glass Card with:

```
Internal padding: 16px 18px
Min-width: fits 5 across in 1fr×5 grid with 14px gaps
Hover: translateY(-2px) + sh-lifted
```

**Top accent bar:**
```
Position: absolute, top 0, full width
Height: 2px
Border-radius: 2px 2px 0 0
Fill: gradient (see §3.4 per card)
```

**Inner layout:**
```
Row 1: [36×36 icon box (r-sm)]         [trend badge (mono, 10px)]
Row 2: [KPI value: mono 26px, weight 700, letter-spacing -1px]
Row 3: [KPI label: 11px, text-2]
Row 4: [KPI sub: 10px, text-3]
```

**Icon box colors** (match accent bar color family):
- Consumption → `rgba(0,212,255, 0.12)` bg
- Reuse → `rgba(0,229,176, 0.12)` bg
- Peak → `rgba(251,191,36, 0.12)` bg
- Savings → `rgba(167,139,250, 0.12)` bg
- Efficiency → `rgba(0,229,176, 0.12)` bg

**Trend badge:**
- `▲ +6.2%` → `rgba(0,229,176, 0.12)` bg, teal text
- `▼ -3.1%` → `rgba(251,113,133, 0.12)` bg, rose text
- `⚠ +12%` → `rgba(251,191,36, 0.12)` bg, amber text

---

### 6.5 Live Telemetry Card — Bar Chart

9 bars representing sensor readings (Zones A–I).

```
Chart container height: 80px
Bar: full-width fill, border-radius 3px 3px 0 0 (top only)
Bar fill gradient: see §3.5
Gap between bars: 5px

X-axis label: JetBrains Mono 8px, text-3

Animation: bars wave up/down with sinusoidal scaleY transform (0.3-1.0 range)
Each bar has a different animation delay (staggered by 0.1s)
```

**Below chart — Live Stats Row (3 tiles):**
```
Layout: flex row, equal width
Each tile: padding 8px 10px, r-sm, rgba(255,255,255,0.025) bg, 1px border rgba(255,255,255,0.05)
Value: JetBrains Mono 15px, color per sensor type
Label: 9px, text-3, margin-top 3px
```

**LIVE indicator (top of card):**
```
Dot: 8×8px circle — solid teal core + pulsing teal ring (ring animates from scale 0.8 to 2.2, opacity 1→0)
Label: "LIVE" — Inter 10px, 600 weight, uppercase, letter-spacing 1px, teal color
```

---

### 6.6 AI Insights Card

List of insight items, each styled as a left-bordered row:

```
Item: padding 10px 12px, r-sm
Background: rgba(255,255,255, 0.025)
Border: 1px solid rgba(255,255,255, 0.05) + left accent (2px solid)
Layout: [severity icon 14px] [insight text 11.5px, text-2] [tag badge aligned-right]
Hover: background rgba(255,255,255,0.04) + translateX(3px)
```

Severity variants:
| Type | Left border | Tag bg | Tag text |
|---|---|---|---|
| warn | `#FBBF24` | amber-dim | amber |
| ok | `#00E5B0` | teal-dim | teal |
| ai | `#A78BFA` | purple-dim | purple |
| info | `#00D4FF` | cyan-dim | cyan |

**Thinking state (AI loading):**
```
Background: purple-dim (rgba(167,139,250,0.12))
Border: 1px solid rgba(167,139,250,0.15)
Border-radius: r-sm
Content: purple text + 3 bouncing dots (5×5px circles, staggered bounce animation)
```

---

### 6.7 Smart Reuse Ring Charts

Three SVG donut ring charts side by side.

```
SVG size: 72×72px
Track: stroke rgba(255,255,255,0.05), stroke-width 6, no fill
Arc: stroke-width 6, stroke-linecap round
Arc colors:
  - Greywater:   #00E5B0  (teal)  +  drop-shadow(0 0 6px #00E5B0)
  - Rainwater:   #00D4FF  (cyan)  +  drop-shadow(0 0 6px #00D4FF)
  - Recycled:    #A78BFA  (purple)+  drop-shadow(0 0 6px #A78BFA)

Percentage label centered in ring: JetBrains Mono, bold, colored per ring
Below ring: 10px Inter 500, text-3
```

---

### 6.8 Cost & Economics Panel

**Top: 2 metric tiles side by side**
```
Each tile: padding 10px 12px, r-sm, rgba(255,255,255,0.025) bg, 1px border
Value: JetBrains Mono 18px, 700 weight — teal for positive, rose for costs
Label: 10px, text-3, margin-top 3px
```

**Savings Progress Bar:**
```
Track: height 6px, r-full, rgba(255,255,255,0.05) bg
Fill: gradient 90° (teal → cyan) + glow shadow (see §3.7)
Label row above: flex between — "Monthly Savings" left, "₹2,450" right — 10px, text-3
```

---

### 6.9 Process Flow (Full Width Row)

Horizontal pipeline of 9 stages connected by arrow-lines.

```
Container: full 3-column span, horizontal scroll if needed
Each step: glass-bg card with icon, step number, label
Connector lines: SVG paths, stroke cyan rgba(0,212,255,0.3), animated with dashoffset stream effect
Active/current step: highlighted with cyan border + glow
```

---

### 6.10 Time-Based Analysis Panel

**Peak hour pills (top):**
```
Pills: flex-wrap row, gap 6px
Padding: 5px 10px, border-radius 999px
Default: rgba(255,255,255,0.03) bg, 0.06 border, text-2
Peak: rgba(255,182,36,0.08) bg, amber border (rgba(251,191,36,0.2)), amber text
Each pill has 5×5px status dot (amber for peak, teal for low)
```

**Day bars (bottom):**
```
Height: 64px
7 bars (Mon–Sun), gap 4px
Normal: purple gradient (see §3.6)
Peak day (Mon/Fri typical): amber gradient + amber glow
Day label: JetBrains Mono 8px, text-3
```

---

## 7. Layout Grid

### 7.1 App Shell

```
Viewport: 100vh, no overflow
Stack (top→bottom): Header (58px fixed) → [Sidebar + Content Area]
```

### 7.2 Main Layout

```
Display: Horizontal flex
Sidebar: 224px fixed width (no shrink)
Content: flex:1, min-width:0 (takes remaining space)
```

### 7.3 Content Area

```
Padding: 20px
Gap: 18px
Overflow: vertical scroll only
```

### 7.4 KPI Grid

```
Columns: 5 × 1fr
Gap: 14px
```

### 7.5 Dashboard Card Grid

```
Columns: 3 × 1fr
Gap: 14px
Full-width cards: span 3 (Process Flow)
Two-column cards: span 2
```

---

## 8. Motion & Animation Guide

> [!NOTE]
> In Figma, use **Smart Animate** and **Prototype** tab to simulate these. For dev handoff, document the easing / duration precisely.

### 8.1 Easing Curves

| Name | Cubic-bezier | Feel |
|---|---|---|
| `ease-out` | `cubic-bezier(0.0, 0, 0.2, 1)` | Snappy, energetic entry |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth transitions |

### 8.2 Durations

| Token | Value | Use |
|---|---|---|
| fast | 150ms | Hover fills, dot color |
| medium | 280ms | Card hover, border, translate |
| slow | 500ms | Entrance animations, bar heights |

### 8.3 Keyframe Animations (dev reference)

| Animation | Behavior | Target |
|---|---|---|
| `fade-up` | Y: +20px→0, opacity 0→1, 500ms ease-out | Cards on mount |
| `blob-1..3` | Translate + scale loop, 18–26s, ease-in-out infinite | Background blobs |
| `pulse-ring` | scale 0.8→2.2, opacity 1→0, 2s ease-out infinite | Live status ring |
| `shimmer` | background-position -200%→+200%, 2s linear infinite | Loading shimmer |
| `bar-wave` | scaleY 0.3→1→0.3, 1.5s ease-in-out infinite (staggered) | Telemetry bars |
| `glow-pulse` | opacity 0.6→1→0.6, 2s ease-in-out infinite | Status dots (ok) |
| `spin` | rotate 0→360deg, 8s linear infinite | Logo orbit ring |
| `ripple` | scale 1→3, opacity 0.4→0, 1s ease-out infinite | Touch ripples |
| `dot-bounce` | scale 0.6→1→0.6, opacity 0.4→1→0.4, 1.2s (staggered) | AI thinking dots |
| `rail-slide` | translateX -8px→0, opacity 0→1, 400ms ease-out | Sidebar items on enter |
| `float` | translateY 0→-6px→0, 3s ease-in-out infinite | Floating icons |
| `count-pop` | scale 1→1.08→1, 300ms ease-out | Counter value update |

### 8.4 Stagger Pattern

Cards in the dashboard grid enter with staggered delays:
- Card 1: 0.08s
- Card 2: 0.16s
- Card 3: …+0.08s per card

---

## 9. Accessibility Notes

| Guideline | Spec |
|---|---|
| Contrast ratio | All primary text on backgrounds ≥ 4.5:1 |
| Focus rings | 2px solid `#00D4FF` (cyan), 2px offset |
| Motion | Respect `prefers-reduced-motion` — disable `blob`, `bar-wave`, `float` animations |
| Font minimum | 10px minimum (meta labels only); 11px for any reading content |
| Color alone | Never use color as the sole indicator (always pair with icon or text) |

---

## 10. Figma Setup Checklist

Use this to set up the Figma file correctly before designing:

- [ ] Install **Inter** and **JetBrains Mono** in Figma
- [ ] Create a **Color Styles** library using §2 (all tokens as named styles)
- [ ] Create **Text Styles** for every entry in §4.2 type scale
- [ ] Create **Effect Styles** for all shadow tokens in §5.3
- [ ] Build the **Background** frame: canvas color `#020C1B` → add 3 blob ellipses → grid overlay
- [ ] Build the **Glass Card** as a component with `::before` inner gradient overlay
- [ ] Create all chip/badge variants as component variants
- [ ] Set up the **Grid Layout** using Figma layout grids (5-col KPI, 3-col dashboard)
- [ ] Create **Prototype flows** for: hover on KPI card, sidebar active state, card entry animation
- [ ] Export design tokens as JSON for developer handoff (use Figma Tokens or Variables plugin)

---

## 11. Visual Design Principles (Designer Brief)

> [!IMPORTANT]
> These are the NON-NEGOTIABLE design rules to maintain the premium feel:

1. **No flat fills on interactive elements.** Always use gradient fills or semi-transparent glass fills.
2. **Glow is essential.** Every colored status dot, ring arc, and accent element must have its matching glow shadow.
3. **Depth through layers.** The visual hierarchy must be felt: canvas → blobs → grid → sidebar/header → cards → content → highlights.
4. **Typography discipline.** KPI values MUST use JetBrains Mono. Never mix mono into prose. Never use body text at less than 11px.
5. **Cyan is the primary CTA color.** Links, active states, focus, interactive chips — always cyan. Teal = success. Purple = AI only.
6. **Background breathes.** The three blobs must feel like bioluminescent depth — use only radial gradients → transparent, never solid circles.
7. **Cards float.** Every card on hover should lift (translateY: -2px) with an elevated shadow. This micro-interaction is critical.
8. **Borders hint, not define.** Use 1px semi-transparent borders — they are about texture, not structure. Never use opaque borders.

---

*Document prepared for Figma design team — Smart Water Management & Monitoring System*  
*Revision 1.0 — Generated from production codebase analysis*
