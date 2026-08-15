# ChaiForm Improvement Checklist

Competitors: Google Forms · Typeform. Research sources: Typeform/Google product pages, FormStory/HubSpot, Reform.app, JMIR, NNG, Unbounce, CXL, Baymard, OpenView.

## A. Product features — P0 (table stakes)

- [ ] 1. AI form generator — prompt → fields + conditional logic
- [ ] 2. Conversational mode — one-question-at-a-time layout (per-form toggle; keep single-page too)
- [ ] 3. Templates library — 15–20 starter templates (RSVP, lead gen, feedback, job app, quiz, contact, NPS)
- [ ] 4. File upload field type
- [ ] 5. Email notification on new response (per-form setting)
- [ ] 6. CSV / Excel export of responses
- [ ] 7. Individual response view (per-submission detail page)
- [ ] 8. Outgoing webhooks (HTTP POST on submit)
- [ ] 9. Google Sheets integration
- [ ] 10. Slack integration
- [ ] 11. Zapier / Make integration
- [ ] 12. Spam protection — honeypot + simple captcha
- [ ] 13. Soften/remove "Workflow ready" landing claim until integrations ship

## B. Product features — P1 (differentiators)

- [ ] 14. Quiz mode with scoring + result page
- [ ] 15. Custom thank-you page + redirect URL
- [ ] 16. Share links with UTM tracking
- [ ] 17. Embed widget + QR code
- [ ] 18. More field types — phone, URL, signature, image choice, searchable dropdown, ranking, Likert scale
- [ ] 19. Per-form theming — colors / fonts (leverage existing design system vs Google Forms)
- [ ] 20. AI response summaries + question-level charts
- [ ] 21. Branding removal ("Powered by ChaiForm") as paid-tier lever
- [ ] 22. Multi-step form sections — manual grouping / pagination

## C. Website & landing page (conversion)

- [ ] 23. Problem-first headline + simpler copy (5th–7th grade reading level)
- [ ] 24. Social proof — testimonials + usage stats near CTAs
- [ ] 25. Live demo — embed a real published form on the landing page
- [ ] 26. Pricing page — generous free tier, "No credit card required"
- [ ] 27. Comparison table — ChaiForm vs Google Forms vs Typeform
- [ ] 28. Templates gallery page (also SEO)
- [ ] 29. Use-case / feature pages (event RSVP, lead gen, feedback…) for mid-funnel SEO
- [ ] 30. CTA micro-copy + trust signals (SSL/privacy) near signup buttons
- [ ] 31. First-login onboarding — route new users to a template picker

## D. Technical & housekeeping

- [ ] 32. Set your git identity (currently developer1@zaucto.com → yours)
- [ ] 33. Add a LICENSE file
- [ ] 34. Rebuild API bundle (`pnpm --filter @repo/api build`) to refresh branding in dist
- [ ] 35. Product analytics (PostHog/Plausible) — measure signup conversion
- [ ] 36. SEO metadata — per-page titles, OG images, sitemap
