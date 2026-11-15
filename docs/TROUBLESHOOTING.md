# Troubleshooting
- Chromium missing: run `npm run setup`.
- Repeated login: close Chromium, remove `.linkedin-playwright-profile/`, and sign in again.
- No timestamps recognized: LinkedIn may have changed or localized its markup. Open an issue with sanitized logs only.
- Wrong cutoff: remember the label is post age, not saved date. Months use 30.4375 days; years use 365.25 days.
