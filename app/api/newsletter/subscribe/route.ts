import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FROM_EMAIL = process.env.FROM_EMAIL || "Pocket Dive <noreply@pocket-dive.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://scienceapp-alpha.vercel.app";

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export async function POST(req: NextRequest) {
    const supabase = getSupabase();
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "有効なメールアドレスを入力してください。" }, { status: 400 });
    }

    // Check if already subscribed
    const { data: existing } = await supabase
        .from("subscribers")
        .select("id")
        .eq("email", email)
        .single();

    if (existing) {
        return NextResponse.json({ message: "このメールアドレスはすでに登録されています。毎朝ダイジェストをお届けします！" });
    }

    // Insert subscriber (works with minimal schema: id, email, created_at)
    const { error } = await supabase
        .from("subscribers")
        .insert({ email });

    if (error) {
        console.error("[newsletter/subscribe] insert error:", error);
        return NextResponse.json({ error: "登録に失敗しました。もう一度お試しください。" }, { status: 500 });
    }

    // Send welcome email if Resend is configured
    if (process.env.RESEND_API_KEY) {
        try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: "【Pocket Dive】ご登録ありがとうございます！",
                html: welcomeEmailHtml(APP_URL),
            });
        } catch (e) {
            console.error("[newsletter/subscribe] email send failed:", e);
            // Don't fail the request if email fails
        }
    }

    return NextResponse.json({
        message: "登録完了！明日の朝から、科学の最前線をお届けします。"
    });
}

function welcomeEmailHtml(appUrl: string) {
    return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Hiragino Sans,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#0f172a;padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#38bdf8;font-size:11px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;">Daily Science Digest</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:900;">POCKET <span style="color:#38bdf8;">DIVE</span></h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:900;color:#0f172a;">ご登録ありがとうございます！🎉</h2>
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.7;">
            明日の朝から、世界の最新科学ニュースをお届けします。<br>
            毎朝7時頃、厳選した科学ニュースと新着論文が届きます。
          </p>
          <div style="background:#f8fafc;border-radius:16px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0f172a;">毎日届くもの：</p>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.8;">
              🌍 世界の最新科学ニュース（日本語要約）<br>
              🔬 新着論文ピックアップ<br>
              📖 難しい用語も分かりやすく解説
            </p>
          </div>
          <div style="text-align:center;margin:32px 0;">
            <a href="${appUrl}/ja" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:13px;font-weight:900;letter-spacing:0.1em;">
              今すぐサイトを見る →
            </a>
          </div>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
            配信停止は <a href="${appUrl}/ja/newsletter?status=unsubscribed" style="color:#94a3b8;">こちら</a> からいつでも可能です。
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#cbd5e1;font-size:11px;">© 2026 Pocket Dive</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
