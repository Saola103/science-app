import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");
    const locale = req.nextUrl.searchParams.get("locale") || "ja";

    if (!token) {
        return NextResponse.redirect(new URL(`/${locale}/newsletter?status=invalid`, req.url));
    }

    const { error } = await supabase
        .from("newsletter_subscribers")
        .update({ confirmed: true, confirmed_at: new Date().toISOString() })
        .eq("confirm_token", token)
        .eq("confirmed", false);

    if (error) {
        return NextResponse.redirect(new URL(`/${locale}/newsletter?status=invalid`, req.url));
    }

    return NextResponse.redirect(new URL(`/${locale}/newsletter?status=confirmed`, req.url));
}
