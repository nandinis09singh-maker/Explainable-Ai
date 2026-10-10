# Data Dynamos XAI

Pitch website for **Explainable AI for Regulated Industries**, by Team Data Dynamos (A.P. Shah Institute of Technology).
A multilingual, audit-ready explainability layer for AI decisions in BFSI, insurance and healthcare.

## Features
- Animated hero, problem, solution pipeline, market, comparison and roadmap sections
- Interactive demo: SHAP-style contribution bars and explanations in English, Hindi, Marathi and Tamil, with RBI / IRDAI / SEBI template names
- Charts (hand-built SVG): TAM/SAM/SOM, radar comparison, weekly line chart, language-mix donut, decline drivers
- Sign in / sign up, an audit log, and an audit report preview
- Light and dark themes, responsive, respects reduced motion

## Run
No build step. Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Notes
- Accounts are stored in the browser's localStorage only (a SHA-256 hash of email and password). There is no backend, so this is a prototype, not real authentication.
- Console charts and audit-log rows marked "sample" are illustrative data. Market figures and the roadmap come from the pitch deck.
- Hindi, Marathi and Tamil text is an illustrative draft and needs review by a native speaker and a compliance officer.
- Fonts load from Google Fonts.

## Deploy on GitHub Pages
Push to GitHub, then Settings > Pages > Deploy from branch > `main` / root.
