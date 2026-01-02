'use client';

import dynamic from 'next/dynamic';
import schools from '@/data/schools.json';
import { School } from '@/lib/types';

// Dynamically import the map component with SSR disabled (Leaflet requires window)
const SchoolMap = dynamic(() => import('@/components/SchoolMap'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-muted">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="h-screen w-full">
      <SchoolMap schools={schools as School[]} />
    </main>
  );
}
