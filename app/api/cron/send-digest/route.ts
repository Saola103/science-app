/**
 * Vercel Cron Job: Daily Newsletter Digest
 * Runs daily at 22:00 UTC (= 07:00 JST next day)
 * Sends top science news + papers to confirmed subscribers.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const maxDuration = 60;

const FROM_EMAIL = process.env.FROM_EMAIL || "Pocket Dive <noreply@pocket-dive.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pocket-dive.app";

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

function getResend() {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
    return new Resend(process.env.RESEND_API_KEY);
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const supabase = getSupabase();
    const resend = getResend();

    // Fetch confirmed subscribers
    const { data: subscribers, error: subError } = await supabase
        .from("subscribers")
        .select("email, unsubscribe_token")
        .eq("confirmed", true);

    if (subError || !subscribers?.length) {
        return NextResponse.json({ message: "No confirmed subscribers", count: 0 });
    }

    // Fetch latest news (top 3)
    const { data: news } = await supabase
        .from("news")
        .select("title, url, summary_general, category, source, published_at")
        .order("published_at", { ascending: false })
        .limit(3);

    // Fetch latest papers (top 3)
    const { data: papers } = await supabase
        .from("papers")
        .select("title, url, summary_general, category, published_at")
        .order("published_at", { ascending: false })
        .limit(3);

    const today = new Date().toLocaleDateString("ja-JP", {
        year: "numeric", month: "long", day: "numeric"
    });

    let sent = 0;
    let failed = 0;

    // Send to each subscriber
    for (const sub of subscribers) {
        const unsubUrl = `${APP_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
        const html = buildDigestHtml(today, news || [], papers || [], unsubUrl);

        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: sub.email,
            subject: `🔬 今日のPocket Dive｜${today}`,
            html,
        });

        if (error) {
            console.error(`[digest] Failed to send to ${sub.email}:`, error);
            failed++;
        } else {
            sent++;
        }
    }

    return NextResponse.json({ message: "Digest sent", sent, failed, total: subscribers.length });
}

function categoryBadge(cat?: string | null) {
    if (!cat) return "";
    const colors: Record<string, string> = {
        PHYSICS: "#3b82f6", BIOLOGY: "#22c55e", GENETICS: "#10b981",
        CHEMISTRY: "#f97316", AI: "#8b5cf6", NEUROSCIENCE: "#ec4899",
        SPACE: "#6366f1", MEDICINE: "#f43f5e", ENVIRONMENT: "#14b8a6",
    };
    const color = colors[cat.toUpperCase()] || "#38bdf8";
    return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:${color}15;color:${color};font-size:10px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;">${cat}</span>`;
}

function newsBlock(items: any[]) {
    if (!items.length) return "<p style='color:#94a3b8;font-size:14px;'>本日のニュースはありません。</p>";
    return items.map(item => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:20px 24px;">
            <div style="margin-bottom:8px;">${categoryBadge(item.category)}</div>
            <a href="${item.url || APP_URL}" style="color:#0f172a;text-decoration:none;font-size:15px;font-weight:700;line-height:1.4;display:block;margin-bottom:8px;">${item.title}</a>
            ${item.summary_general ? `<p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.6;">${item.summary_general.slice(0, 180)}...</p>` : ""}
            <p style="margin:0;color:#cbd5e1;font-size:11px;">${item.source || ""}</p>
          </td></tr>
        </table>
    `).join("");
}

function papersBlock(items: any[]) {
    if (!items.length) return "<p style='color:#94a3b8;font-size:14px;'>本日の論文はありません。</p>";
    return items.map(item => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr>
            <td width="4" style="background:#38bdf8;border-radius:4px;">&nbsp;</td>
            <td style="padding:0 0 0 16px;">
              <a href="${item.url || APP_URL}" style="color:#0f172a;text-decoration:none;font-size:14px;font-weight:700;line-height:1.4;display:block;margin-bottom:4px;">${item.title}</a>
              ${item.summary_general ? `<p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">${item.summary_general.slice(0, 120)}...</p>` : ""}
            </td>
          </tr>
        </table>
    `).join("");
}

function buildDigestHtml(today: string, news: any[], papers: any[], unsubUrl: string) {
    return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Hiragino Sans,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- Masthead -->
        <tr><td style="background:#0f172a;padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;color:#38bdf8;font-size:10px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;">Daily Science Digest</p>
                <h1 style="margin:4px 0 0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">POCKET <span style="color:#38bdf8;">DIVE</span></h1>
              </td>
              <td align="right">
                <p style="margin:0;color:#475569;font-size:12px;font-weight:700;">${today}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Today's News -->
        <tr><td style="padding:32px 40px 16px;">
          <h2 style="margin:0 0 20px;font-size:13px;font-weight:900;color:#38bdf8;letter-spacing:0.2em;text-transform:uppercase;border-bottom:2px solid #f1f5f9;padding-bottom:12px;">
            📰 今日のサイエンスニュース
          </h2>
          ${newsBlock(news)}
        </td></tr>

        <!-- Today's Papers -->
        <tr><td style="padding:16px 40px 32px;">
          <h2 style="margin:0 0 20px;font-size:13px;font-weight:900;color:#38bdf8;letter-spacing:0.2em;text-transform:uppercase;border-bottom:2px solid #f1f5f9;padding-bottom:12px;">
            🔬 新着論文
          </h2>
          ${papersBlock(papers)}
        </td></tr>

        <!-- CTA -->
        <tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <a href="${APP_URL}/ja" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:12px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;">
            サイトで全て読む →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#cbd5e1;font-size:11px;line-height:1.8;">
            © 2026 Pocket Dive · <a href="${APP_URL}/ja/privacy" style="color:#cbd5e1;text-decoration:none;">プライバシーポリシー</a><br>
            <a href="${unsubUrl}" style="color:#cbd5e1;text-decoration:none;">配信停止はこちら</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
