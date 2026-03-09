"use server";

import { saveInquiryToSupabase } from "../supabase/serviceClient";
import { redirect } from "../../i18n/routing";

export async function submitInquiry(formData: FormData, locale: string) {
    const topic = formData.get("topic") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    if (!topic || !message) {
        return { error: "Topic and Message are required." };
    }

    try {
        await saveInquiryToSupabase({
            topic,
            email,
            message
        });

        // On success, we can redirect or return success state
        // For simplicity, let's redirect to a success state or home
    } catch (err) {
        console.error("Action error:", err);
        return { error: "Failed to submit inquiry. Please try again later." };
    }

    redirect({ href: "/", locale: locale as any });
}
