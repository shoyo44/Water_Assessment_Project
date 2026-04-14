---
name: frontend-design-light
description: Creates human-centric, high-fidelity frontend interfaces with a focus on light themes, tactile elegance, and organic motion. Use this for building web components, landing pages, and dashboards that feel airy, approachable, and premium. Avoids generic AI layouts in favor of boutique, designer-grade craftsmanship.
license: Complete terms in LICENSE.txt
---

This skill directs the creation of human-centric, light-themed interfaces that feel "alive" and tactile. It moves away from cold, robotic structures toward layouts that prioritize breathability, soft depth, and sophisticated typography.

## Human-Centric Design Thinking

Before coding, visualize the "vibe" of a physical space. Aim for an interface that feels like a well-lit studio or a premium editorial magazine:
- **Atmosphere**: Focus on "Lumina" aesthetics—interfaces that feel like they are bathed in natural light. Use soft shadows and translucency to create a sense of physical layers.
- **Human Touch**: Incorporate "imperfections" that feel human—slight organic curves, hand-drawn-style icons, or asymmetrical whitespace that breaks the grid in a pleasing way.
- **Accessibility as Beauty**: Design for clarity. High legibility and intuitive spatial cues should be the foundation of the aesthetic, not an afterthought.

## The Light-Theme Optimization

### 1. Palette & Depth (The "Paper & Light" Rule)
- **Base**: Never use pure #FFFFFF. Use "off-whites" with subtle tints (e.g., bone, alabaster, or a very faint cool-grey) to reduce eye strain.
- **Depth**: Use "Soft-UI" principles. Instead of harsh borders, use extremely soft, large-spread shadows (`box-shadow: 0 10px 30px rgba(0,0,0,0.03)`) to make elements appear to float on a bed of light.
- **Accents**: Use high-chroma but sophisticated colors (Terracotta, Sage, Cobalt, or Deep Ochre) to create focal points against the light background.

### 2. Typography (The Voice)
- **Selection**: Avoid system fonts. Pair a high-contrast Serif (for a human, editorial feel) with a geometric but warm Sans-Serif. 
- **Hierarchy**: Use dramatic scale differences. A very large, thin heading paired with small, wide-tracked subheaders creates a "boutique" look.
- **Detail**: Use `text-wrap: balance` and appropriate line-height (1.6x or 1.8x) to ensure the text feels airy and readable.

### 3. Tactile Motion & Interaction
- **Micro-interactions**: Hover states should feel "magnetic" or "squishy." Use Spring physics (via Framer Motion or CSS `cubic-bezier(0.175, 0.885, 0.32, 1.275)`) rather than linear transitions.
- **Staggered Entry**: Animate elements with a "fanned-out" entry. Items should slide into view with a slight delay between them, mimicking a deck of cards being laid on a table.
- **Cursor Play**: In light themes, a custom "ring" cursor that interacts with text (e.g., inverting or expanding) adds a layer of premium polish.

### 4. Spatial Composition (The "Gallery" Layout)
- **Negative Space**: Treat whitespace as a structural element, not "empty" space. Use generous margins to let components breathe.
- **The "Bento" Evolution**: While Bento grids are popular, break them. Let one image or text block bleed off the edge or overlap two grid cells to create visual tension and interest.
- **Glassmorphism**: Use `backdrop-filter: blur()` sparingly on headers or floating menus to maintain the "light" feel while adding modern depth.

## Technical Execution
- **CSS Architecture**: Use HSL color variables to easily manage "lightness" and "saturation" across the theme.
- **SVG Patterns**: Use very faint noise textures or subtle geometric dot grids in the background to prevent the UI from looking "flat" or "cheap."
- **Performance**: High-quality light designs rely on crispness. Use SVGs for all illustrative elements and ensure images use `object-fit: cover` within refined border-radii (e.g., `24px` or `32px`).

NEVER default to the "Generic Startup" look (Blue buttons, Inter font, centered hero). Aim for something that looks like it was custom-coded by a high-end design agency.