# Career Agent — Design System Specification

## 1. Visual Language: AI Career Intelligence — Soft Premium
The design aesthetic combines:
- **Premium SaaS:** Clean, airy, crisp typography and structured information hierarchy.
- **Modern AI Product:** Subtle electric blue and soft lavender accents; purposeful micro-interactions.
- **Mobile-Native Touch Ergonomics:** $\ge 44\text{px}$ touch targets, bottom tab bar within thumb reach.

## 2. Color Palette & Tokens
| Token | Hex | Role |
| :--- | :--- | :--- |
| `--career-blue` | `#2563EB` | Primary brand CTA, active tabs, accent links |
| `--career-blue-hover` | `#1D4ED8` | Hover / pressed state for primary buttons |
| `--ai-indigo` | `#6366F1` | AI intelligence indicators, interview tags |
| `--soft-lavender` | `#EEF2FF` | Background tint for AI cards & pill containers |
| `--career-success` | `#10B981` | Match scores $\ge 90\%$, verified milestones |
| `--career-warning` | `#F59E0B` | Human input needed, screening verification |
| `--career-error` | `#EF4444` | Rejections, expired postings, errors |
| `--career-bg` | `#F8FAFC` | App canvas background (Slate-50) |
| `--career-surface` | `#FFFFFF` | Card surfaces and top/bottom bars |
| `--career-text` | `#0F172A` | Primary typography |
| `--career-secondary` | `#64748B` | Secondary text |
| `--career-muted` | `#94A3B8` | Timestamps, inactive states |
| `--career-border` | `#E2E8F0` | Subtle hairline dividers and card borders |

## 3. Typography
- **Families:** `Plus Jakarta Sans` for display/headings, `Inter` for prose and body copy.
- **Scale:**
  - Display: 28–32px (Splash / Hero titles)
  - Page Heading: 22–24px
  - Section Heading: 16–18px
  - Body: 14–15px
  - Caption / Metadata: 11–13px
- **Numerals:** `tabular-nums` for all stats, salary numbers, and application counters.

## 4. Radii & Surface Math
- Small: 10px (buttons, small chips)
- Medium: 14px (inputs, tab groups)
- Large: 18px (dialogs, sheet headers)
- Primary Cards: 20px–24px (`rounded-[22px]`)
- Shadows: Soft diffused elevation (`0 4px 20px -2px rgba(15,23,42,0.05)`). Zero harsh black drop shadows.
