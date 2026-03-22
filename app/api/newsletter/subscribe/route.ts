import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const FROM_EMAIL = process.env.FROM_EMAIL || "Pocket Dive <noreply@pocket-dive.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pocket-dive.app";

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
        .from("newsletter_subscribers")
        .select("id, confirmed")
        .eq("email", email)
        .single();

    if (existing?.confirmed) {
        return NextResponse.json({ message: "このメールアドレスはすでに登録されています。" });
    }

    // Insert or update
    const confirmToken = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();

    const { error: upsertError } = await supabase
        .from("newsletter_subscribers")
        .upsert({
            email,
            confirmed: false,
            confirm_token: confirmToken,
            unsubscribe_token: unsubscribeToken,
            updated_at: new Date().toISOString(),
        }, { onConflict: "email" });

    if (upsertError) {
        console.error("[newsletter/subscribe] upsert error:", upsertError);
        return NextResponse.json({ error: "登録に失敗しました。もう一度お試しください。" }, { status: 500 });
    }

    // Send confirmation email
    const confirmUrl = `${APP_URL}/newsletter/confirm?token=${confirmToken}`;

    if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: "【Pocket Dive】メールアドレスの確認をお願いします",
            html: confirmEmailHtml(confirmUrl),
        });
    }

    return NextResponse.json({
        message: "確認メールを送信しました。メールをご確認のうえ、リンクをクリックして登録を完了してください。"
    });
}

function confirmEmailHtml(confirmUrl: string) {
    return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
        <!-- Header -->
        <tr><td style="background:#0f172a;padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#38bdf8;font-size:11px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;">Daily Science Digest</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">POCKET <span style="color:#38bdf8;">DIVE</span></h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:900;color:#0f172a;">ご登録ありがとうございます</h2>
          <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;">
            以下のボタンをクリックして、メールアドレスの確認を完了してください。<br>
            確認が完了すると、毎朝世界の最新科学ニュースをお届けします。
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${confirmUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:13px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;">
              登録を確認する →
            </a>
          </div>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
            このメールに心当たりがない場合は無視してください。<br>
            リンクの有効期限は24時間です。
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#cbd5e1;font-size:11px;">© 2026 Pocket Dive · <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy" style="color:#cbd5e1;">プライバシーポリシー</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
