# Amplification Estimate

A hearing-aid pricing website for Dr. Sarah Alhorebi, audiologist at Buffalo Hearing & Speech Center (BHSC). When a patient comes in, she clicks through a few steps and has the price in minutes.

## What it does

- **Estimate:** each step opens once the one before it is answered: manufacturer, one aid or two, style, model (with search), what's included, earmolds, then add-ons. Earlier answers stay visible at the top, and a tap goes back to any of them. It ends in a receipt with the patient's name, case number and billing code, plus Copy and New patient buttons.
- **Medicaid:** NY Medicaid prices for ReSound, Phonak and Starkey. It covers the hearing aids only, up to $330 per aid.
- **Price lists** (clinic's hosted version only): load a new manufacturer price list, preview what's new or changed, and apply it. It needs the shared price storage that only the hosted version has, so a copy built from this repo hides the tab and shows the built-in prices.

It has an Apple-style look in the BHSC logo blue with the Inter font, a slide-in sidebar for the tabs, and a light/dark switch. It's made for phones and iPads: no pinch or double-tap zoom, content stays clear of the iPhone notch, and nothing runs past the screen edge.

## Run it

Open `dist/index.html` in a browser. It's a single self-contained file.

To build it yourself (Node and Python 3):

```bash
npm install
npm run build
```

This runs `vite build` and then `postbuild.py`, and writes `dist/index.html`.

## Built with

React 18, Vite 5, Tailwind CSS 3 and lucide-react. `vite-plugin-singlefile` inlines everything into one HTML file.

The animations are real 21st.dev components, in `src/components/ui/` with the 21st.dev URL and ID at the top of each file: Blur Fade #1079, Segmented Control #23552, the sidebar drawer #23558, the bottom sheet #31360 and Undo Pill #29941. They run on Motion and Base UI.
