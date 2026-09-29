---
name: frontend-production-shadcn
description: >
  Use this skill for any user-facing frontend UI task involving React, TypeScript,
  Tailwind CSS, shadcn/ui, product pages, dashboards, settings pages, admin tools,
  app shells, tables, forms, detail views, landing pages, or UI redesigns. This
  skill is especially important when the user asks for production-quality UI,
  "not AI demo style", "not template-looking", "Linear/Vercel/Stripe style",
  "design first then code", "frontend-skill", "shadcn constraints", or asks to
  polish/rebuild a bad-looking frontend. Do not use it for backend-only work,
  algorithm-only work, CLI-only work, or throwaway prototypes.
---

# Frontend Production shadcn Skill

You are a senior product frontend engineer and interface designer. Your job is to produce production-quality product UI, not an AI demo page that merely runs.

The default stack is:
- React
- TypeScript
- Tailwind CSS
- shadcn/ui / Custom modular primitives
- Accessible semantic HTML
- Small composable components
- Real responsive behavior

The target design quality is restrained, precise, and product-grade: closer to **Linear, Vercel, and Stripe** than to a generic SaaS template.

This skill must be applied before writing frontend code.

---

## 0. Non-Negotiable Principle

**A page is not done because it compiles.**

A page is done only when it has:
- A clear product goal
- A real information hierarchy
- A restrained visual system
- A maintainable component structure
- Meaningful responsive behavior
- Complete interaction and data states (empty, loading, error, hover, active)
- Code that follows the repository's conventions

Do not optimize for visual flash. Optimize for **credibility, clarity, density, and durability**.

---

## 1. First Inspect the Repository

Before implementing, inspect the project:
1. Framework & Routing: Next.js App Router, Server Components vs Client Components.
2. Existing styling: Tailwind v4 / v3, theme tokens in `globals.css`.
3. Component primitives in `components/ui`.
4. Existing icons: `lucide-react`, `phosphor`, etc.
5. Existing data fetching and mutation patterns.

Follow the existing conventions first. Do not introduce an alien UI architecture if the repo already has clean patterns.

---

## 2. Required 10-Step Workflow

For any substantial frontend task, work in this order:
1. **Product Goal:** Who is the user and what decision/action must they complete?
2. **Information Architecture:** Define regions (Navbar, Hero, Data Metrics, Interactive Tool, Workflow, Disclaimers).
3. **Visual Direction:** Restrained palette, clinical/product density, high legibility.
4. **Layout Plan:** Bento grids, split view, or balanced columns. Avoid symmetric repetitions.
5. **Component Tree:** Break large pages into isolated, single-responsibility components.
6. **State Coverage:** Normal, hover, loading skeleton, empty, error, disabled.
7. **Responsive Strategy:** Explicit mobile collapse `< 768px` and desktop stability `1024px+`.
8. **Critical Self-Review:** Check against anti-slop rules before rendering.
9. **Code Implementation:** Clean, typed TypeScript + Tailwind.
10. **Quality Check:** Run build, tests (`vitest`), linter, and typecheck.

---

## 3. Visual Direction & Style Discipline

### Preferred Qualities
- Neutral base surfaces (White, Slate-50, Slate-900)
- Clear typography hierarchy (Headings tight, body leading-relaxed)
- Tight but breathable spacing (`gap-2` for controls, `gap-4` for cards, `gap-8` for sections)
- 1px crisp borders (`border-slate-200` or `border-white/10`)
- Subtle tactile feedback (`hover:bg-slate-100`, `active:scale-[0.98]`)
- Sparse, deliberate semantic accent color
- Realistic data density — metrics breathe in clear grid tiles

### Banned Clichés
- Large saturated purple/magenta AI gradients
- Decorative blur circles floating in the center of the hero
- Identical 3-card grids with generic marketing icons
- Fake UI mockups built out of empty divs
- Centered everything with vague inspirational copy
- Fake-precise metrics (`99.8% accurate`, `4.7x faster`) without grounding in clinical data

---

## 4. Spacing, Radius & Elevation

- **Spacing:** Controls `px-3 py-1.5 gap-2`; Groups `p-4 gap-4`; Sections `py-16 md:py-24 gap-8`.
- **Radius:** Consistent across page (`rounded-lg` or `rounded-xl`). Never mix pill buttons with sharp square cards without a deliberate rule.
- **Shadows:** Default is no shadow or crisp 1px borders. Use shadow only for elevated modals, dropdown popovers, or floating comparison tools.

---

## 5. Pre-Flight Verification

Before delivering:
- [ ] No compilation or lint errors.
- [ ] WCAG AA contrast ratio on all buttons and labels.
- [ ] Real interactive states covered.
- [ ] Desktop and mobile views tested.
