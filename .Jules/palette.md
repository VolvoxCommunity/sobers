# Palette's Journal

## 2025-02-28 - Auth Loading States & Accessibility

**Learning:** Users often click "Sign In" multiple times if they don't see immediate visual feedback, especially on slower connections. Also, screen readers need to know when a button is processing an action.
**Action:** Always replace button text with a spinner during async operations and use `accessibilityState={{ busy: true }}` to inform assistive technologies.
