'use client';
import { usePathname } from '../i18n/routing';

// /proto/* and /feedapp/* ship their own fixed-position header/nav chrome
// (see components/BottomNav.tsx's matching guard) and manage their own
// viewport-fill layout — the shipped app's own "reserve space for BottomNav"
// padding must not apply there, or it silently pads the page 60px taller
// than the viewport, making body scroll when it shouldn't.
export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPrototype = pathname?.includes('/proto') || pathname?.includes('/feedapp');
  return <main className={isPrototype ? undefined : 'min-h-screen pb-[60px]'}>{children}</main>;
}
