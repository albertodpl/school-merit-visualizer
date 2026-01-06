# School Merit Visualizer

Interactive map visualization of Swedish school performance data from Skolverket.

## Features

- **Interactive Map**: Browse 6,500+ schools across Sweden on an OpenStreetMap-based map
- **School Categories**: Filter by school type (F-6, F-9, 7-9, Gymnasium, Anpassad grundskola)
- **Performance Data**:
  - Grade 9: Merit values (meritvärde) with 5-year trends
  - Grade 6: National test scores (Swedish, English, Math) with performance benchmarks
  - Gymnasium: University eligibility rates, grade points, graduation rates
- **Home Location**: Set your address to see distances and get directions
- **Color Modes**: View by category or performance level

## Tech Stack

- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- react-leaflet (OpenStreetMap)
- Data from [Skolverket API](https://api.skolverket.se)

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Data Updates

The school data is fetched from Skolverket's API. To refresh the data:

```bash
# Fetch latest data from Skolverket (takes ~15 min)
pnpm run fetch-data

# Process raw data into optimized format
pnpm run process-data
```

## License

MIT
