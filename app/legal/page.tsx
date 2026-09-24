export default function LegalPage() {
    return (
        <div className="mx-auto max-w-4xl px-6 py-24 space-y-12">
            <h1 className="text-4xl font-black">特定商取引法に基づく表記</h1>
            <div className="prose dark:prose-invert max-w-none space-y-8 font-medium text-slate-700 dark:text-slate-300">
                <table className="w-full border-collapse">
                    <tbody>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold w-1/3">運営者名</td>
                            <td className="py-4">Saola (Science Papers Project)</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">お問い合わせ先</td>
                            <td className="py-4">contact@saolams.com</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">販売価格</td>
                            <td className="py-4">無料（非営利の教育目的サービスとして運営しており、基本無料を継続する方針です）</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">引き渡し時期</td>
                            <td className="py-4">アカウント登録・ログイン機能はなく、サイトにアクセス後すぐにご利用いただけます。</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">キャンセル・返品</td>
                            <td className="py-4">デジタルコンテンツの特性上、返品は不可。アカウント登録自体がないため退会の手続きは不要で、ブラウザでの利用をやめることでいつでも利用を終了できます。</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
