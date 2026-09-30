# Development Rules & Engineering Conventions

All contributors and engineers building subsequent modules MUST abide by these 20 governing rules:

1. **Build Module-by-Module:** Follow the sequence in `MODULES.md`. Do not leap ahead to future modules before the current milestone is verified.
2. **Architecture Stability:** Do not rewrite or dismantle established folder architectures without explicit product architecture sign-off.
3. **No Framework Churn:** Stick to the core tech stack (React, TypeScript, Vite, Tailwind CSS, Node Express backend).
4. **No Component Duplication:** Compose existing design system primitives from `src/components/ui/` rather than creating ad-hoc copies.
5. **Decouple Business Logic:** Keep business and calculation logic inside dedicated hooks, services, or server modules; keep UI components focused on presentation.
6. **Server Logic Server-Side:** Never execute background automation, scraping, or secret operations in the browser client.
7. **Secrets Boundary:** Secrets stay on the server. Never expose private credentials or keys to Vite client bundles.
8. **Isolated Mock Data:** Mock data must remain in `mock/demo-data/`. Never intermingle mock stubs into production client components or database repositories.
9. **AI Service Abstraction:** All Gemini API interactions must run behind formal tool registries and server service layers.
10. **Repository Pattern:** Database access must occur through structured repository/service layers, never through raw, scattered client queries.
11. **Strict Input Validation:** Validate and sanitize all incoming client inputs and API payloads.
12. **Mobile-First Priority:** Default to mobile viewport ergonomics (390x844 baseline). Test touch targets ($\ge 44\text{px}$) and thumb accessibility.
13. **Accessibility (WCAG AA):** Maintain semantic markup, color contrast ratios, screen reader labels, and keyboard navigation.
14. **Respect Design System Tokens:** Never scatter hardcoded arbitrary colors or radii. Use centralized tokens defined in `src/styles/tokens.css`.
15. **Continuous Verification:** Run `compile_applet` and type-checking after significant changes.
16. **No Silent Regressions:** Do not remove existing screens, navigation items, or functionality when adding new features.
17. **Inspect Before Modifying:** Always inspect an existing module's files and documentation before editing it.
18. **No Premature Feature Creep:** Implement only what the active module specifies. Avoid speculative, half-built placeholders.
19. **Anti-Hallucination & Candidate Truth:** The AI must NEVER fabricate candidate employment history, credentials, or metrics.
20. **Ethical Automation:** Respect third-party platform terms of service, robots.txt, and rate limits. Never attempt automated CAPTCHA bypasses.
