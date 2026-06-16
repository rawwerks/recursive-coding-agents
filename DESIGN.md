---
name: Recursive Coding Agents Talk
description: Public talk deck and website for Raymond Weitekamp's AI Engineer World's Fair 2026 presentation.
colors:
  warm-stage-bg: "oklch(0.9195 0.0169 88.0030)"
  warm-stage-surface: "oklch(0.9530 0.0156 86.4257)"
  stage-ink: "oklch(0.2350 0 0)"
  stage-muted: "oklch(0.4688 0.0136 84.5932)"
  stage-border: "oklch(0.8434 0.0231 87.1621)"
  stage-accent: "oklch(0.3012 0 0)"
  dark-stage-bg: "oklch(0.1913 0 0)"
  dark-stage-ink: "oklch(0.9173 0.0133 82.4015)"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(2.2rem, 7vw, 5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0"
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(1.6rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(1.12rem, 0.96rem + 0.7vw, 1.58rem)"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(0.78rem, 0.72rem + 0.26vw, 1rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.22em"
rounded:
  sm: "5px"
  md: "8px"
  lg: "0.5rem"
  xl: "0.7rem"
  pill: "999px"
spacing:
  slide-pad: "clamp(1.5rem, 6vw, 6rem)"
  content-max: "min(1080px, calc(100vw - (var(--pad) * 2)))"
  stack-sm: "clamp(1rem, 2.6vw, 1.6rem)"
  stack-md: "clamp(1.4rem, 3.5vw, 2.4rem)"
  stack-lg: "clamp(2.4rem, 6vw, 3.4rem)"
components:
  button-primary:
    backgroundColor: "{colors.stage-accent}"
    textColor: "{colors.warm-stage-bg}"
    rounded: "{rounded.pill}"
    padding: "clamp(0.7rem, 1.6vw, 0.95rem) clamp(1.4rem, 3vw, 2rem)"
  card-evidence:
    backgroundColor: "{colors.warm-stage-surface}"
    textColor: "{colors.stage-ink}"
    rounded: "{rounded.md}"
    padding: "clamp(0.7rem, 1.5vw, 1rem)"
  table-row-selected:
    backgroundColor: "color-mix(in oklch, var(--primary) 10%, transparent)"
    textColor: "{colors.stage-accent}"
    rounded: "{rounded.md}"
---

# Design System: Recursive Coding Agents Talk

## 1. Overview

**Creative North Star: "The Reliability Briefing"**

The deck should feel like a precise briefing from someone who has built the thing being argued for. It is public-facing and persuasive, but the persuasion comes from evidence, structure, and restraint rather than decoration. The current system uses a warm stage background, near-black ink, large Inter headlines, real artifact previews, and small interaction details to keep the argument grounded.

The personality is rigorous, pragmatic, and provocative. A slide can make a sharp claim, but the next visual beat should give the viewer a citation, a rubric, a repository, or a concrete proof path. The system explicitly rejects generic AI SaaS gradients, template card grids, academic wall-of-text slides, and hacker-terminal cosplay.

**Key Characteristics:**

- High-contrast, stage-readable typography with one dominant idea per viewport.
- Warm neutral surfaces with near-black type and sparing accent use.
- Evidence imagery: article cards, paper previews, repository cards, and linked artifacts.
- Responsive, scroll-snapped slides that remain a normal website with anchors.
- Minimal motion that supports navigation and does not gate content.

## 2. Colors

The palette is warm, restrained, and evidence-forward: surfaces recede, ink carries the thesis, and the accent is mostly a command signal.

### Primary

- **Stage Accent** (`stage-accent`): The near-black primary role. Use it for CTAs, emphasis, active navigation dots, and selected rubric states.

### Neutral

- **Warm Stage Background** (`warm-stage-bg`): The main slide background. It should stay quiet enough for projected text and screenshot evidence.
- **Warm Stage Surface** (`warm-stage-surface`): Alternate slides and card-like evidence surfaces. Use it to separate narrative beats without making a floating-card layout.
- **Stage Ink** (`stage-ink`): Primary text. Use it for headlines, strong claims, and evidence captions.
- **Stage Muted** (`stage-muted`): Supporting text and metadata. Keep contrast at WCAG AA; do not push it lighter for elegance.
- **Stage Border** (`stage-border`): Hairline structure for tables, previews, and shadcn components.
- **Dark Stage Background** (`dark-stage-bg`) and **Dark Stage Ink** (`dark-stage-ink`): Available for high-emphasis inverted sections, not the default mood.

### Named Rules

**The Evidence Before Color Rule.** Color should never be the main proof of importance. If a claim matters, support it with hierarchy, structure, and a real artifact before adding chroma.

**The No AI Glow Rule.** Do not add generic purple-blue AI gradients, neon glows, or blurred decorative blobs. This talk is about reliability, not atmosphere.

## 3. Typography

**Display Font:** Inter (with sans-serif fallback)  
**Body Font:** Inter (with sans-serif fallback)  
**Label/Mono Font:** Inter for labels; reserve mono only for literal code or terminal output if it appears.

**Character:** The type system is direct and engineered: large enough for a conference room, simple enough for a web page, and free of ornamental cleverness. Inter is already committed in the theme; its job here is clarity under projection, not brand novelty.

### Hierarchy

- **Display** (700, `clamp(2.2rem, 7vw, 5rem)`, 1.05): Slide titles and single-claim openings only.
- **Headline** (700, `clamp(1.6rem, 4vw, 3rem)`, 1.1): Section headings, explanatory turns, and slide-level summaries.
- **Body** (400, `clamp(1.12rem, 0.96rem + 0.7vw, 1.58rem)`, 1.5): Supporting paragraphs and slide explanations. Keep line lengths comfortably under 75ch.
- **Label** (600, `clamp(0.78rem, 0.72rem + 0.26vw, 1rem)`, `0.22em`, uppercase): Eyebrows and evidence metadata. Use sparingly as orientation, not as automatic section grammar.

### Named Rules

**The One Thought Rule.** If a slide needs multiple display-scale thoughts, split the slide. The deck should advance in clean turns.

**The No Wall Rule.** Do not solve weak hierarchy by adding more text. Reduce, separate, or turn the evidence into a visual artifact.

## 4. Elevation

The system uses a hybrid of flat stage surfaces and low ambient elevation. Most slides are flat at rest. Evidence previews, repository cards, and paper cards can lift slightly because they behave like inspected artifacts rather than decorative cards.

### Shadow Vocabulary

- **CTA Lift** (`0 10px 30px -12px color-mix(in srgb, var(--deck-accent) 50%, transparent)`): Primary CTA hover affordance only.
- **Evidence Lift** (`0 28px 70px -38px color-mix(in oklch, var(--deck-text) 55%, transparent)`): Paper and screenshot previews.
- **Repo Ambient Lift** (`0 24px 80px -56px color-mix(in srgb, var(--foreground) 55%, transparent)`): GitHub repository preview cards.

### Named Rules

**The Artifact Lift Rule.** Shadows are allowed when the object is a real artifact to inspect: a paper preview, article preview, repository card, or CTA. Do not apply elevation to every list item.

## 5. Components

### Buttons

- **Shape:** Full pill for deck CTAs; shadcn buttons use compact rounded-md geometry.
- **Primary:** Near-black background with warm foreground text, bold type, and responsive horizontal padding.
- **Hover / Focus:** A small upward transform and brighter shadow are allowed on CTAs. Focus must use a visible outline or ring.
- **Secondary / Outline:** Use bordered shadcn outline buttons for supporting links, especially inside repository cards.

### Cards / Containers

- **Corner Style:** Evidence cards use 8px radii; shadcn cards use the theme radius scale.
- **Background:** Use Warm Stage Surface or shadcn `--card`. Avoid nested cards.
- **Shadow Strategy:** Use Evidence Lift or Repo Ambient Lift only when the card represents a linked artifact.
- **Border:** Use 1px mixed borders for structure. Do not use colored side stripes.
- **Internal Padding:** Evidence previews stay compact; slide content gets rhythm from the global clamp spacing tokens.

### Tables / Rubrics

- **Style:** Tables are dense and evidence-oriented. Text stays small but readable, with selected rows using primary tint instead of heavy decoration.
- **State:** The row that represents the thesis can use stronger borders and primary tint; all other rows should remain quiet.

### Navigation

- **Style:** The deck is vertically scroll-snapped with fixed right-side dots as progressive enhancement.
- **State:** Active dots use Stage Accent and scale slightly. Inactive dots stay muted and low-opacity.
- **Accessibility:** Dots are real anchors with accessible labels. Keyboard navigation supports arrows, page keys, Home/End, and Space.

### Evidence Previews

- **Style:** Article, paper, and repository previews should look inspectable and linked. Use real screenshots or rendered artifact previews with explicit alt text.
- **Behavior:** Hover can lift by 2px and darken the border toward the accent. The image should remain the lead object.

## 6. Do's and Don'ts

### Do:

- **Do** keep each slide focused on one claim or narrative turn.
- **Do** support provocation with visible evidence: papers, article cards, repository previews, rubrics, or links.
- **Do** preserve responsive slide layouts so the deck works as a real website, not a scaled fixed canvas.
- **Do** use real artifact imagery when a slide cites external work.
- **Do** keep muted text dark enough for WCAG AA contrast.

### Don't:

- **Don't** use generic AI SaaS gradients.
- **Don't** build template card grids where every card has the same icon-heading-body pattern.
- **Don't** create academic wall-of-text slides.
- **Don't** use hacker-terminal cosplay or monospace as shorthand for technical credibility.
- **Don't** add colored side-stripe borders, gradient text, decorative glassmorphism, or blurred orb backgrounds.
- **Don't** add an eyebrow automatically to every new slide; labels must earn their place as orientation.
