import { NextRequest, NextResponse } from "next/server";
import { summarize } from "../../../lib/llm/summarize";

// arXiv API Base URL
const ARXIV_BASE_URL = "http://export.arxiv.org/api/query";

export async function POST(req: NextRequest) {
    try {
        const { query, timeRange = "all", format = "summary", mode = "keyword" } = await req.json();

        if (!query || typeof query !== "string") {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        if (mode === "deep") {
            return handleDeepSearch(query);
        }

        // 1. Build arXiv Query
        let searchQuery = query;
        if (timeRange && timeRange !== "all") {
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
                    // Prompt for copyright-safe and brand-consistent summarization
                    const prompt = `あなたは「Pocket Dive」の専属サイエンスライターです。
以下の論文概要（Abstract）をもとに、300文字程度の日本語で要約を作成してください。

【制約事項】:
1. 原文の表現をそのままコピーせず、事実に基づいてあなたの言葉で再構築（リフレーズ）してください（著作権保護）。
2. 文体は知的で親しみやすい「です・ます調」を徹底してください。
3. 専門用語は一般の人にもわかるよう、必要に応じて噛み砕いて説明してください。

【対象】:
${paper.summary}`;

                    content = await summarize(prompt, { maxLength: 400 });
                } catch (err) {
                    console.error("Summarization failed:", err);
                }
            } else if (format === "title") {
                content = "";
            }

            return {
                ...paper,
                summary_general: content, // Use this as the main display
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
        const journal = "arXiv"; // Arxiv specific
        const pdfUrl = entry.match(/<link title="pdf" href="([\s\S]*?)"/)?.[1] ||
            entry.match(/<link href="([\s\S]*?)" rel="alternate"/)?.[1] || id;

        const cleanTitle = title.replace(/\s+/g, " ");

        return {
            id,
            title: cleanTitle,
            summary,
            published_at: publishedAt,
            url: pdfUrl,
            journal: journal
        };
    }).slice(0, 10);
}

async function handleDeepSearch(query: string) {
    try {
        const prompt = `あなたは科学論文の専門家コンシェルジュです。
ユーザーの好奇心「${query}」を深掘りし、最適な研究分野へ導くための対話を行ってください。

【回答ルール】:
1. 知的で丁寧な日本語（です・ます調）を使用してください。
2. 回答の冒頭には、ユーザーの興味に対する肯定的なフィードバックと、関連する研究分野の示唆（例：量子物理学、認知心理学など）を入れてください。
3. ユーザーの考えを整理するために、2つ程度の具体的な質問を投げかけてください。
4. 回答はマークダウン形式で、見出しを活用して読みやすく構成してください。

【ブランドトーン】:
Pocket Dive - 知の最前線へ、美しくダイブする。`;

        const response = await summarize(prompt, { maxLength: 600 });

        return NextResponse.json({
            message: response,
            papers: [] // Initial engagement might not have papers yet
        });
    } catch (err) {
        return NextResponse.json({ error: "Deep search intelligence failed." }, { status: 500 });
    }
}

