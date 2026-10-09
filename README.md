# Amplification Estimate

A hearing-aid pricing website for Dr. Sarah Alhorebi, audiologist at Buffalo Hearing & Speech Center (BHSC). When a patient comes in, she fills in one page and has the price in minutes.

## What it does

- **Estimate:** the whole order on one page, every question a dropdown: one aid or two, then manufacturer, style and model, what's included, earmolds and accessories. When the two ears get different hearing aids, the order splits into a **Right ear** and a **Left ear** card, side by side on a computer. The estimate updates live next to the order, with the patient's name, case number, billing code and *Copy estimate*.
  - **Accessories:** BHSC cost × 1.2. Any accessory can be typed in with its cost.
  - **Refund if returned:** works out the refund from BHSC's return policy. BHSC keeps 5% of the hearing aid charge and 5% of the fitting charge, plus a $200 (one aid) or $300 (two aids) service fee. Returning one side of a pair has no penalty.
  - **CROS/BiCROS:** priced as a one-aid CROS plus a one-aid hearing aid, as the 2026 tier pricing says.
- **Compare prices:** up to four hearing aids side by side for one patient, with the cheapest marked and how much more the others cost. *Use in estimate* opens the Estimate with the one the patient picks.
- **2026 HA prices:** every hearing aid on the 2026 lists with its tier and the patient price for one aid and two, plus the tier and fee table.

It is one self-contained HTML file with no server, logins or outside services. It's built mainly for a computer and also works on phones and iPads, in light or dark mode.

## Run it

Open `dist/index.html` in a browser. It's a single self-contained file. The live copy is on GitHub Pages (the `gh-pages` branch).

To build it yourself (Node and Python 3):

```bash
npm install
npm run build
```

This runs `vite build` and then `postbuild.py`, and writes `dist/index.html`.

## Not in this repo

BHSC's own costs per hearing aid (`src/data/costs.json`) and the manufacturer price lists are confidential and stay in the clinic's private copy. Without the cost file the app builds the same way; the 2026 HA prices tab just doesn't show a cost column.

## Built with

React 18, Vite 5, Tailwind CSS 3 and lucide-react. `vite-plugin-singlefile` inlines everything into one HTML file.

The animations are real 21st.dev components, in `src/components/ui/` with the 21st.dev URL and ID at the top of each file: Blur Fade #1079, Segmented Control #23552, the sidebar drawer #23558, the bottom sheet #31360 and Undo Pill #29941. They run on Motion and Base UI.
