'use client';

import { useEffect, useRef } from 'react';

interface AdBannerProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Google AdSense Banner Component
 * Publisher ID is set via NEXT_PUBLIC_ADSENSE_PUBLISHER_ID env variable.
 * Set the ID in .env.local and Vercel environment variables.
 */
export function AdBanner({ adSlot, adFormat = 'auto', className = '', style }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

  useEffect(() => {
    if (!publisherId) return;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // AdSense not loaded yet — safe to ignore in dev
    }
  }, [publisherId]);

  if (!publisherId) {
    // Show placeholder in development / before AdSense approval
    return (
      <div
        className={`flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-300 text-[10px] font-bold uppercase tracking-widest ${className}`}
        style={{ minHeight: 90, ...style }}
      >
        Ad Space
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`} style={style}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={publisherId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}
