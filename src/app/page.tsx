'use client';

import { Sidebar } from '@/components/Sidebar';
import { Wizard } from '@/components/wizard/Wizard';

export default function Home() {
  return (
    <div className="flex h-screen bg-[var(--ca-black)]">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Wizard />
      </main>
    </div>
  );
}
