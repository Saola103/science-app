import { NextRequest, NextResponse } from "next/server";
import { summarize } from "@/lib/llm/summarize";

// arXiv API Base URL
const ARXIV_BASE_URL = "http://export.arxiv.org/api/query";

export async function POST(req: NextRequest) {
    try {
        const { query, timeRange = "all", format = "summary", mode = "keyword" } = await req.json();

        if (!query || typeof query !== "string") {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        if (mode === "deep") {
            // Handle Deep Search (Conversational) - This will be a more complex multi-turn logic
            // For now, let's implement the search part first.
            // In a real app, we might use a session id to track state.
            return handleDeepSearch(query);
        }

        // 1. Build arXiv Query
        let searchQuery = query;
        if (timeRange !== "all") {
            const dateFilter = getDateFilter(timeRange);
            searchQuery = `${query} AND lastUpdatedDate:[${dateFilter} TO 99991231235959]`;
        }

        const params = new URLSearchParams({
            search_query: searchQuery,
            start: "0",
            max_results: "10",
            sortBy: "submittedDate",
            sortOrder: "descending"
        });

        const response = await fetch(`${ARXIV_BASE_URL}?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`arXiv API error: ${response.statusText}`);
        }

        const xmlText = await response.text();
        const papers = parseArxivXml(xmlText);

        // 2. Process Format (Summarize if needed)
        const processedPapers = await Promise.all(papers.map(async (paper) => {
            let content = paper.summary; // original abstract

            if (format === "summary") {
                try {
                    // Use Gemini to summarize (Japanese ですます調 as requested)
                    content = await summarize(paper.summary, { tone: "casual", maxLength: 300 });
                } catch (err) {
                    console.error("Summarization failed:", err);
                    // fallback to original or simplified
                }
            } else if (format === "title") {
                content = ""; // Just title and links
            }

            return {
                ...paper,
                displayContent: content,
                format: format
            };
        }));

        return NextResponse.json({ papers: processedPapers });

    } catch (error: any) {
        console.error("[Search API] Fatal error:", error);
        return NextResponse.json({ error: "Search service unavailable" }, { status: 500 });
    }
}

function getDateFilter(range: string): string {
    const now = new Date();
    let startDate = new Date();

    switch (range) {
        case "6mo": startDate.setMonth(now.getMonth() - 6); break;
        case "1yr": startDate.setFullYear(now.getFullYear() - 1); break;
        case "5yr": startDate.setFullYear(now.getFullYear() - 5); break;
        case "10yr": startDate.setFullYear(now.getFullYear() - 10); break;
        default: return "20000101000000";
    }

    return startDate.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

function parseArxivXml(xml: string) {
    const entries = xml.split("<entry>");
    entries.shift(); // remove header

    return entries.map(entry => {
        const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || "No Title";
        const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || "No Abstract";
        const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
        const publishedAt = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || "";
        const pdfUrl = entry.match(/<link title="pdf" href="([\s\S]*?)"/)?.[1] ||
            entry.match(/<link href="([\s\S]*?)" rel="alternate"/)?.[1] || id;

        // Clean title from newlines
        const cleanTitle = title.replace(/\s+/g, " ");

        return {
            id,
            title: cleanTitle,
            summary, // This is the original abstract
            published_at: publishedAt,
            url: pdfUrl,
            source: "arXiv"
        };
    }).slice(0, 10);
}

async function handleDeepSearch(query: string) {
    try {
        const prompt = `あなたは科学論文の専門家です。ユーザーが「${query}」という内容に興味を持っていますが、具体的なキーワードがまだはっきりしていないかもしれません。
        ユーザーに対して、興味を深めるための質問を2つ投げかけ、${query}に関連する研究分野（例えば量子物理学、分子生物学など）を示唆してください。
        回答は「Pocket Dive」のブランドトーンに合わせ、知的で丁寧な日本語（です・ます調）で返してください。`;

        const response = await summarize(prompt, { maxLength: 400 });

        return NextResponse.json({
            message: response,
            papers: []
        });
    } catch (err) {
        return NextResponse.json({ error: "Deep search intelligence failed." }, { status: 500 });
    }
}
