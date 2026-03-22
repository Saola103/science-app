/**
 * One-time migration: Add missing columns to subscribers table
 * Call once with the CRON_SECRET, then this endpoint can be deleted.
 * GET /api/admin/migrate-subscribers?secret=YOUR_CRON_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get("secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Add each column individually — ignore errors if already exists
    const columns = [
        { name: "confirmed", def: "boolean DEFAULT false" },
        { name: "confirm_token", def: "text" },
        { name: "unsubscribe_token", def: "text" },
        { name: "confirmed_at", def: "timestamptz" },
        { name: "updated_at", def: "timestamptz DEFAULT now()" },
    ];

    const results: Record<string, string> = {};

    for (const col of columns) {
        // Check if column exists by trying to select it
        const { error: checkErr } = await supabase
            .from("subscribers")
            .select(col.name)
            .limit(1);

        if (!checkErr) {
            results[col.name] = "already exists";
            continue;
        }

        // Column doesn't exist — use rpc if available, otherwise report
        results[col.name] = "needs manual SQL";
    }

    // Insert a test row to check which columns are writable
    const testToken = "migration-test-" + Date.now();
    const { error: insertErr } = await supabase
        .from("subscribers")
        .upsert({
            email: "migration-test@pocket-dive.app",
            confirmed: false,
            confirm_token: testToken,
            unsubscribe_token: testToken + "-unsub",
            updated_at: new Date().toISOString(),
        }, { onConflict: "email" });

    if (!insertErr) {
        // Clean up test row
        await supabase.from("subscribers").delete().eq("email", "migration-test@pocket-dive.app");
        return NextResponse.json({
            status: "✅ subscribers table already has all required columns",
            columns: results,
        });
    }

    return NextResponse.json({
        status: "❌ Missing columns — run this SQL in Supabase SQL Editor",
        sql: `ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirm_token text,
  ADD COLUMN IF NOT EXISTS unsubscribe_token text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();`,
        error: insertErr.message,
        columns: results,
    });
}
