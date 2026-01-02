# School Merit Visualizer - Design Document

**Date:** 2026-01-02
**Status:** Approved

## Overview

A map-based visualization of Swedish school merit statistics (meritvärde) for grundskola, helping users compare schools geographically. Primary use case: finding good school locations when house hunting.

## Tech Stack

Matching [albertoprietolofkrantz-website](https://github.com/albertodpl/albertoprietolofkrantz-website):

- **Next.js 15.4.8** (App Router + Turbopack)
- **React 19.1.2** + TypeScript 5 (strict mode)
- **Tailwind CSS v4** with PostCSS
- **pnpm** package manager
- **Vercel** hosting (separate project)

Additional:
- **react-leaflet** + Leaflet for maps
- **OpenStreetMap** tiles (free, no API key)
- **react-leaflet-cluster** for marker clustering

## Data Source

**Skolverket Planned Educations API** (official, free, CC0 license):

1. School list with coordinates:
   ```
   GET https://api.skolverket.se/planned-educations/v3/compact-school-units?coordinateSystemType=WGS84
   ```

2. Statistics per school:
   ```
   GET https://api.skolverket.se/planned-educations/v3/school-units/{id}/statistics/gr
   ```

**Data refresh:** Manual script run yearly (data updates once per school year)

## Project Structure

```
school-merit-visualizer/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, metadata
│   │   ├── page.tsx            # Main map page
│   │   └── globals.css         # Tailwind + map styles
│   ├── components/
│   │   ├── SchoolMap.tsx       # Leaflet map with markers
│   │   ├── SchoolMarker.tsx    # Custom marker with merit color
│   │   ├── SchoolPopup.tsx     # Info popup with directions
│   │   ├── FilterPanel.tsx     # Filter controls
│   │   ├── HomeMarker.tsx      # Draggable home location
│   │   └── Legend.tsx          # Color scale legend
│   ├── lib/
│   │   ├── types.ts            # TypeScript interfaces
│   │   └── utils.ts            # cn() helper, distance calc
│   └── data/
│       └── schools.json        # Static school data (generated)
├── scripts/
│   └── fetch-schools.ts        # Data fetcher from Skolverket API
├── package.json
├── vercel.json
├── tsconfig.json
└── README.md
```

## Data Model

```typescript
interface School {
  id: string;                    // schoolUnitCode
  name: string;
  coordinates: [number, number]; // [lat, lng] WGS84
  municipality: string;
  type: 'municipal' | 'independent';
  address: {
    street: string;
    postalCode: string;
    city: string;
  };
  statistics: {
    meritValue: number | null;   // Latest year (0-340)
    meritHistory: { year: string; value: number }[];
    studentsPerTeacher: number | null;
    certifiedTeachersRatio: number | null;
    passRateGrade9: number | null;
  };
}
```

## UI Components

### Map View
- Full viewport height
- Centered on Sweden, default zoom to Stockholm area
- Clustered markers when zoomed out
- Individual colored markers when zoomed in

### Merit Color Scale
| Range | Color | Label |
|-------|-------|-------|
| < 200 | Red | Below average |
| 200-230 | Orange | Average |
| 230-250 | Yellow | Above average |
| 250-280 | Green | High |
| > 280 | Blue | Top performers |

### School Popup
```
┌─────────────────────────────────┐
│ School Name                     │
│ Municipality · Type             │
├─────────────────────────────────┤
│ Meritvärde: 275.4               │
│ █████████████████░░░ (81%)      │
├─────────────────────────────────┤
│ 📊 5-year trend: ↗ +8.3         │
│ 👩‍🏫 Teachers: 92% certified     │
│ ✅ Pass rate: 98%               │
├─────────────────────────────────┤
│ 📍 2.3 km from home             │
│ [🚶 Walk] [🚴 Bike] [🚌 Transit]│
└─────────────────────────────────┘
```

### Home Marker Feature
- Click map or enter address to set "home" location
- Draggable marker
- Saved to localStorage
- Enables distance calculation and Google Maps direction links

### Filter Panel (collapsible)
- Municipality dropdown
- Merit range slider (0-340)
- School type toggle (municipal/independent)
- Search by school name
- Sort by: Merit / Distance from home

### Legend
- Fixed bottom-right corner
- Color scale with labels

## Google Maps Integration

Direction links in popup (no API key required):
```
https://www.google.com/maps/dir/?api=1
  &origin={homeLat},{homeLng}
  &destination={schoolLat},{schoolLng}
  &travelmode=walking|bicycling|transit
```

## Deployment

**Vercel Configuration:**
- Region: `iad1`
- Framework: Next.js
- Build command: `pnpm build`
- Install command: `pnpm install`

**Security headers** (matching personal site):
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

**Domain:** `skolkarta.albertoprietolofkrantz.dev` (or `.vercel.app`)

## Data Fetching Script

```bash
pnpm run fetch-data
```

1. Fetches all school units with WGS84 coordinates
2. Filters for grundskola only
3. Fetches statistics for each school
4. Writes merged data to `src/data/schools.json`
5. Run manually once per year after school year ends

## Future Enhancements (not in scope)

- Gymnasie school data
- Isochrone travel time visualization
- Routing API integration for actual travel times
- Comparison view (side-by-side schools)
- Embed in personal website projects section
