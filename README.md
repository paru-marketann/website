# Marketann website

The marketann.ai landing page, built with [Astro](https://astro.build). It's a static site:
`npm run build` outputs plain HTML/CSS/JS to `dist/`, which can be hosted anywhere.

## Deploying

The site is hosted on Netlify, which builds it from this GitHub repo (settings in `netlify.toml`):

- **Push or merge to `main`** and Netlify builds and deploys to production.
- **Open a pull request** and Netlify posts a deploy preview link on it, so changes can be checked
  before they're merged.

Day-to-day: make a branch, commit, push it, open a pull request, check the preview, merge.

## Commands

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm install`     | Install dependencies                          |
| `npm run dev`     | Dev server with hot reload at localhost:4321  |
| `npm run build`   | Production build into `dist/`                 |
| `npm run preview` | Serve the production build locally            |

## Structure

```
src/
  layouts/Base.astro           <head>, fonts, global styles
  styles/global.css            design tokens, reset, Apercu @font-face
  pages/index.astro            the landing page
  components/
    Header.astro, Hero.astro, HowItWorks.astro, WhyUs.astro, Footer.astro, Logo.astro
    ContactForm.astro          contact section + form (see below)
    WaitlistForm.astro         email signup (see below)
    BrandEngine/               the hero animation (markup, namespaced CSS, timeline in TS)
public/
  fonts/                       Apercu .woff2 files go here once licensed
```

Component styles are scoped by Astro. The one exception is `BrandEngine/brand-engine.css`,
which is global because the animation creates elements at runtime, so every selector in it
is prefixed with `.be`.

## Forms (Formspree)

Both the waitlist and the contact form post to one Formspree form. Copy `.env.example` to `.env`
and set `PUBLIC_FORM_ENDPOINT` to its URL (`https://formspree.io/f/...`), then restart the dev
server. The same variable needs setting on the host, since it's baked in at build time.

Every submission includes `form: "waitlist"` or `form: "contact"`. Waitlist entries are just an
email; contact entries add name, company and message. Each sets `_subject` so the notification
emails are easy to tell apart.

If the variable is unset, the waitlist just shows its thank-you message (storing nothing) and the
contact form opens a pre-filled email to info@marketann.ai. The contact form also has a hidden
"website" field that catches bots: anything that fills it in is quietly dropped.

## Fonts

The brand font is Apercu (Colophon Foundry, paid). Until the web licence files are added to
`public/fonts/`, the site uses Figtree as a stand-in.

## Animation debugging

In the browser console, `__beSeek(t)` freezes the hero animation at `t` seconds, and
`__beTotal` holds the loop length.
