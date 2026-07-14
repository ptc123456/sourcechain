---
name: SourceChain Editorial Evidence System
theme: dark
tokens:
  color: { canvas: "#090c10", surface: "#10151b", text: "#f3f6f8", text-muted: "#a9b4bf", accent: "#3dd6c6", border: "#29333d", success: "#4bd6a2", warning: "#f1bd63", danger: "#ff7b7b" }
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96]
  radius: [6, 10, 14]
  type: { body: Outfit, data: JetBrains Mono }
  motion: { fast: 120ms, base: 200ms, ease: "cubic-bezier(0.16, 1, 0.3, 1)" }
---

# Design intent

SourceChain should feel like an editorial evidence desk rather than a speculative crypto dashboard. The interface prioritizes provenance, verdicts, transaction state, and readable long-form evidence.

Use a near-black neutral canvas, restrained elevation, and one cyan accent. Green, amber, and red are reserved for semantic status. Typography carries hierarchy; cards are used only where a bounded record or task needs one.

Avoid decorative gradients, ambient glows, emoji icons, excessive pills, glass blur, fabricated social proof, and animation without state meaning. Interactions must remain keyboard accessible, maintain 44px touch targets, and become single-column below 768px.
