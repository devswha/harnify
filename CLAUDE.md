# Harnify — Project Rules

## Design Rules

### Color Palette
- Use [Coolors](https://coolors.co/) to define the project palette
- **2-3 colors maximum** — primary, accent, and optionally a secondary
- All UI components must stay within the defined palette

### UI Components
- **shadcn/ui** is the component library for all Web Dashboard UI
- Do not introduce other component libraries (no MUI, Ant Design, Chakra, etc.)
- Follow shadcn/ui conventions: use `cn()` for className merging, Tailwind CSS for styling

### Design Prototyping
- Use **Google Stitch** for layout/UI design mockups
- Always input **English prompts** when generating designs in Stitch
- Export Stitch outputs as reference before implementing in code

## Tech Stack (enforced)
- Runtime: Node.js (TypeScript)
- CLI Build: tsup
- Web Build: Vite + React
- Styling: Tailwind CSS + shadcn/ui
- Graph: Cytoscape.js
