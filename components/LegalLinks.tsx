import Link from "next/link";

/**
 * 利用規約・プライバシーポリシー・このアプリについて への導線(G4法務整備)。
 * 既存の Footer コンポーネントはマーケ用の大型フッターでモバイルの全画面フィードに
 * 合わないため、アプリ内で使える小さなリンク行として別に用意した。
 */
export function LegalLinks({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const color = tone === "dark" ? "text-white/40" : "text-[#94A3B8]";
  return (
    <nav aria-label="規約・ポリシー" className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11.5px] ${color} ${className}`}>
      <Link href="/terms" className="underline underline-offset-2">利用規約</Link>
      <Link href="/privacy" className="underline underline-offset-2">プライバシーポリシー</Link>
      <Link href="/about" className="underline underline-offset-2">このアプリについて</Link>
    </nav>
  );
}
