'use client';
import { usePathname } from '../i18n/routing';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const HomeIcon = ({ filled }: { filled: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
      fill={filled ? 'white' : 'none'}
      stroke="white"
      strokeWidth={filled ? '0' : '1.8'}
    />
  </svg>
);

const FeedIcon = ({ filled }: { filled: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3"
      fill={filled ? 'white' : 'none'}
      stroke="white" strokeWidth={filled ? '0' : '1.8'}
    />
    <path d="M9 8L16 12L9 16V8Z"
      fill={filled ? 'black' : 'white'}
      opacity={filled ? 1 : 0.9}
    />
  </svg>
);

const SearchIcon = ({ filled }: { filled: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7"
      fill={filled ? 'white' : 'none'}
      stroke="white" strokeWidth="1.8"
    />
    <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    {filled && <circle cx="11" cy="11" r="4" fill="black" />}
  </svg>
);

const ProfileIcon = ({ filled }: { filled: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4"
      fill={filled ? 'white' : 'none'}
      stroke="white" strokeWidth="1.8"
    />
    <path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20"
      fill={filled ? 'white' : 'none'}
      stroke="white" strokeWidth="1.8" strokeLinecap="round"
    />
  </svg>
);

export function BottomNav() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'ja';

  const items = [
    { label: 'ホーム',    href: `/${locale}`,          icon: HomeIcon,    match: (p: string) => p === `/${locale}` || p === '/' },
    { label: 'フィード',  href: `/${locale}/feed`,      icon: FeedIcon,    match: (p: string) => p.includes('/feed') },
    { label: '検索',      href: `/${locale}/search`,    icon: SearchIcon,  match: (p: string) => p.includes('/search') },
    { label: 'マイページ',href: `/${locale}/profile`,   icon: ProfileIcon, match: (p: string) => p.includes('/profile') || p.includes('/login') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-black/90 backdrop-blur-xl border-t border-white/10 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-[60px] max-w-lg mx-auto px-2">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as any}
              className="flex flex-col items-center justify-center gap-1 min-w-[64px] h-full"
            >
              <div className={`transition-transform duration-150 ${active ? 'scale-110' : 'opacity-50'}`}>
                <Icon filled={active} />
              </div>
              <span className={`text-[9px] font-bold tracking-wider transition-colors ${active ? 'text-white' : 'text-white/40'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
