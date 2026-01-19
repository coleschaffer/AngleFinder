'use client';

import { Sidebar } from '@/components/Sidebar';
import { Wizard } from '@/components/wizard/Wizard';

export default function Home() {
  return (
    <div className="flex h-dvh bg-[var(--ca-black)]">
      <Sidebar />
      {/* Main content - add top padding on mobile for fixed header */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Wizard />
      </main>
    </div>
  );
}
