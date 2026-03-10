
const fs = require('fs');
const path = require('path');

const messagesDir = path.join(process.cwd(), 'messages');
const files = fs.readdirSync(messagesDir);

// 各言語のAboutページ用テキスト定義
const aboutTexts = {
    "ja": {
        "title": "運営者情報",
        "projectTeam": "POCKET DIVE 開発チーム",
        "description": "Pocket Diveは、科学情報へのアクセシビリティ向上を目的とした非営利の探索プラットフォームです。AI技術を用いて、難解な学術論文や最新の科学ニュースを整理・要約し、次世代を担う学生から専門家まで、誰もが科学の最前線に触れられる環境を構築しています。",
        "motivationTitle": "開発の背景と目的",
        "motivation": "科学技術の進展に伴い、最新の知見は日々膨大な情報として蓄積されています。しかし、専門的な学術知見と、それを必要とする社会との間には「情報格差」という分厚い壁が存在します。本プロジェクトは、学術研究の入り口に立つ若き探究者たちが、英語の壁や専門用語の壁に挫折することなく、自身の興味に基づいて最短距離で知の深淵へダイブできる環境を提供することを目的としています。",
        "complianceTitle": "コンプライアンスと著作権ポリシー",
        "compliance": "本プロジェクトは、学術的なオープンアクセス精神に基づき運営されています。",
        "complianceList1": "情報ソース: arXiv 等のライセンスが明確なオープンアクセスリポジトリのみを対象としています。",
        "complianceList2": "知的財産権の尊重: AIによる要約生成においては、元の著作物の表現を模倣せず、事実関係のみを再構成する手法を徹底しています。",
        "complianceList3": "権利保護: 掲載されている情報について、著作権者様より削除要請があった場合は速やかに対応いたします。ご連絡は contact@pocket-dive.app までお願いいたします。",
        "contactInfo": "お問い合わせ: contact@pocket-dive.app"
    },
    "en": {
        "title": "About the Project",
        "projectTeam": "POCKET DIVE Project Team",
        "description": "Pocket Dive is a non-profit exploration platform aimed at improving accessibility to scientific information. Using AI technology, we organize and summarize complex academic papers and the latest scientific news, creating an environment where everyone from the next generation of students to experts can touch the forefront of science.",
        "motivationTitle": "Motivation",
        "motivation": "With the advancement of science and technology, the latest knowledge is accumulated as vast amounts of information every day. However, there is a thick wall of 'information gap' between specialized academic knowledge and the society that needs it. This project aims to provide an environment where young explorers standing at the entrance of academic research can dive into the abyss of knowledge based on their interests without being frustrated by language barriers or technical terminology.",
        "complianceTitle": "Compliance & Copyright Policy",
        "compliance": "This project is operated based on the spirit of academic open access.",
        "complianceList1": "Information Sources: We only target open access repositories with clear licenses such as arXiv.",
        "complianceList2": "Respect for Intellectual Property: In AI summary generation, we strictly adhere to methods that reconstruct only factual relationships without mimicking the expression of the original work.",
        "complianceList3": "Rights Protection: If there is a request for deletion from the copyright holder regarding the posted information, we will respond promptly. Please contact contact@pocket-dive.app.",
        "contactInfo": "Contact: contact@pocket-dive.app"
    }
};

// 共通の辞書更新（PaperCardなどで使う一般/専門など）
const commonUpdates = {
    "ja": {
        "general": "一般向け",
        "expert": "専門家向け",
        "noSummary": "要約がありません",
        "noAbstract": "アブストラクトがありません",
        "urlCopied": "URLをコピーしました",
        "loginRequired": "ブックマークにはログインが必要です",
        "paperSource": "出典",
        "terms": "利用規約",
        "privacy": "プライバシーポリシー",
        "legal": "特定商取引法に基づく表記"
    },
    "en": {
        "general": "General",
        "expert": "Expert",
        "noSummary": "No summary available",
        "noAbstract": "No abstract available",
        "urlCopied": "URL copied to clipboard",
        "loginRequired": "Login required to bookmark",
        "paperSource": "Source",
        "terms": "Terms of Service",
        "privacy": "Privacy Policy",
        "legal": "Legal Notice"
    }
};

// 他言語への簡易マッピング（英語をベースにする）
const getAboutText = (lang) => {
    if (lang === 'ja') return aboutTexts.ja;
    return aboutTexts.en; // デフォルトは英語
};

const getCommonUpdate = (lang) => {
    if (lang === 'ja') return commonUpdates.ja;
    // 簡易的な翻訳マッピング（本来はちゃんと翻訳すべきだが、今回は英語をベースにキーを統一）
    // UI上の表示は英語になるが、キーが欠落するよりは良い
    return commonUpdates.en;
};

files.forEach(file => {
    if (file.endsWith('.json')) {
        const lang = file.replace('.json', '');
        const filePath = path.join(messagesDir, file);
        
        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Aboutセクションの更新
            content.About = getAboutText(lang);
            
            // Commonセクションの更新（既存のものにマージ）
            content.Common = { ...content.Common, ...getCommonUpdate(lang) };
            
            fs.writeFileSync(filePath, JSON.stringify(content, null, 4));
            console.log(`Updated ${file}`);
        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
});
