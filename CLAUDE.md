# School Merit Visualizer

Interactive map visualization of Swedish school performance data from Skolverket.

## Tech Stack

- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- react-leaflet (OpenStreetMap)

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components (SchoolMap, FilterPanel, Legend, etc.)
├── data/             # Processed school data (schools.json)
│   └── raw/          # Raw API data (gitignored)
├── lib/              # Types, utilities, constants
scripts/
├── fetch-schools.ts  # Fetches data from Skolverket API
├── process-raw-data.ts # Processes raw data into schools.json
```

## Commands

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm run fetch-data   # Fetch from Skolverket (~15 min)
pnpm run process-data # Process raw data into schools.json
```

## Data Flow

1. `fetch-data` downloads from Skolverket API → saves to `src/data/raw/`
2. `process-data` transforms raw data → saves to `src/data/schools.json` with metadata
3. App imports `schools.json` and displays on map

## School Categories

- F-6: Grundskola grades F-6
- F-9: Grundskola grades F-9
- 7-9: Grundskola grades 7-9
- gymnasium: High school
- anpassad: Special needs schools

## Key Components

- `SchoolMap.tsx`: Main map with markers, filtering, home location
- `SchoolPopup.tsx`: Popup with school details and statistics
- `FilterPanel.tsx`: Category filters, search, color mode toggle
- `Legend.tsx`: Color legend for performance/category modes
