module.exports = {

"[project]/.next-internal/server/app/api/evaluate/route/actions.js [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
}}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}}),
"[project]/src/lib/paperEvaluator.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "ArxivPaperEvaluator": ()=>ArxivPaperEvaluator
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
class ArxivPaperEvaluator {
    openai;
    constructor(){
        this.openai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_API_BASE
        });
    }
    /**
   * ArxivのURLから論文情報を取得
   */ async fetchPaperInfo(arxivUrl) {
        // arXiv IDを抽出
        const arxivIdMatch = arxivUrl.match(/(\d{4}\.\d{5})/);
        if (!arxivIdMatch) {
            throw new Error('Invalid arXiv URL');
        }
        const arxivId = arxivIdMatch[1];
        // arXiv APIを使用して論文情報を取得
        const apiUrl = `http://export.arxiv.org/api/query?id_list=${arxivId}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch paper information');
            }
            const xmlText = await response.text();
            // 簡易的なXMLパース（正規表現を使用）
            const titleMatch = xmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/);
            const summaryMatch = xmlText.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
            const title = titleMatch ? titleMatch[1].trim() : '';
            const abstract = summaryMatch ? summaryMatch[1].trim() : '';
            // 著者情報を取得
            const authors = [];
            const authorMatches = xmlText.matchAll(/<name[^>]*>(.*?)<\/name>/g);
            for (const match of authorMatches){
                const name = match[1].trim();
                if (name) authors.push(name);
            }
            // カテゴリ情報を取得
            const subjects = [];
            const categoryMatches = xmlText.matchAll(/<category[^>]*term="([^"]*)"[^>]*>/g);
            for (const match of categoryMatches){
                const term = match[1];
                if (term) subjects.push(term);
            }
            return {
                title,
                authors,
                abstract,
                arxivId,
                subjects
            };
        } catch (error) {
            throw new Error(`Failed to fetch paper information: ${error}`);
        }
    }
    /**
   * 指定日付のarXiv論文リストを取得
   */ async fetchPapersByDate(date) {
        const categories = [
            'cs.AI',
            'cs.CV',
            'cs.LG'
        ];
        const papers = [];
        for (const category of categories){
            try {
                // arXiv APIで指定カテゴリの論文を取得
                const apiUrl = `http://export.arxiv.org/api/query?search_query=cat:${category}&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending`;
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    console.warn(`Failed to fetch papers for category ${category}`);
                    continue;
                }
                const xmlText = await response.text();
                // エントリを抽出
                const entryMatches = xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
                for (const entryMatch of entryMatches){
                    const entryXml = entryMatch[1];
                    // 投稿日をチェック
                    const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
                    if (publishedMatch) {
                        const publishedDate = publishedMatch[1].split('T')[0]; // YYYY-MM-DD形式
                        if (publishedDate === date) {
                            // 論文情報を抽出
                            const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
                            const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
                            const idMatch = entryXml.match(/<id[^>]*>.*?\/([0-9]{4}\.[0-9]{5})<\/id>/);
                            const title = titleMatch ? titleMatch[1].trim() : '';
                            const abstract = summaryMatch ? summaryMatch[1].trim() : '';
                            const arxivId = idMatch ? idMatch[1] : '';
                            // 著者情報を取得
                            const authors = [];
                            const authorMatches = entryXml.matchAll(/<name[^>]*>(.*?)<\/name>/g);
                            for (const match of authorMatches){
                                const name = match[1].trim();
                                if (name) authors.push(name);
                            }
                            // カテゴリ情報を取得
                            const subjects = [];
                            const categoryMatches = entryXml.matchAll(/<category[^>]*term="([^"]*)"[^>]*>/g);
                            for (const match of categoryMatches){
                                const term = match[1];
                                if (term) subjects.push(term);
                            }
                            if (title && abstract && arxivId) {
                                papers.push({
                                    title,
                                    authors,
                                    abstract,
                                    arxivId,
                                    subjects,
                                    publishedDate: publishedDate
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`Error fetching papers for category ${category}:`, error);
            }
        }
        return papers;
    }
    /**
   * OpenAI APIを使用して論文を評価
   */ async evaluatePaperWithOpenAI(paperInfo) {
        const prompt = `Arxiv search toolを使って、次のことを調査してほしい。
1. 著名な研究者が著者の中に含まれているか
2. 著名な研究者が1st Authorであるか
3. タイトルやAbstractより、革新的な論文であるかどうか。
4. タイトルやAbstractより、機械学習の一般の研究者からビジネス活用を考える一般のビジネスマンまで応用可能性の広い論文であるかどうか。
上記をそれぞれ1~5の5段階で評価してほしい。
ただし、1については、非常に有名な著者（Jeffery Hintonなど）であれば5をつける。一般に知られていない著者であれば1をつける。満点ではない場合、名は知られていないが精華大学など著名な大学に所属していれば1点を加点して良い（例；名は知られていないが東京大学所属の場合、2点とする)。
また、2については、5段階ではなく1 or 5でよい。
3については、既存概念を覆すレベルであれば満点を、それほどではないが産業活用がすぐに進む見込みのある内容であれば3点をつける。すぐに淘汰されそうな内容であれば1点をつける。
4については、内容が明瞭であり、一般のビジネスマンにも理解できそうなレベルで産業応用性の高い内容であれば満点をつける。理解できるレベルではあるが適用できる産業が限られる場合（医療限定、など）であれば3点。応用可能性が低く、中長期的にも一部の研究者にしか読まれなそうな内容であれば1点をつける。

1−4の総合点を算出してほしい。

それを踏まえて、以下の場合+3点加点する。
・論文において学習を伴う実験が実施されていること
・GenAIやAIエージェント、画像生成、LLMなど、キャッチーなトピックに関するものである場合

以下の場合、カッコに書いている点数分を減点する。
・学術的な先進性を示す論文ではなく、新しいGUIに関するWhitePaperなど、Software Engineeringに関する内容である場合。(-5点)
・論理展開が不透明でエビデンスに乏しい内容の場合 (-4点)

上記を踏まえた最終的な点数を以下フォーマットで出力してほしい。
理由：{各観点について箇条書きで説明。Total 300字程度で。}
総計：{各観点の点数を足し算した結果を表示。例：1+2+1+4-3 = 5}
point: {点数。総計で算出される点数}

対象論文：
タイトル: ${paperInfo.title}
著者: ${paperInfo.authors.join(', ')}
Abstract: ${paperInfo.abstract}`;
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4.1-mini',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });
            const content = completion.choices[0].message.content || '';
            // レスポンスをパース
            const { evaluation, formattedOutput } = this.parseOpenAIResponse(content);
            return {
                evaluation,
                formattedOutput
            };
        } catch (error) {
            throw new Error(`Failed to evaluate paper with OpenAI: ${error}`);
        }
    }
    /**
   * OpenAIのレスポンスをパースして評価結果に変換
   */ parseOpenAIResponse(content) {
        // 理由を抽出
        const reasoningMatch = content.match(/理由：([\s\S]*?)総計：/);
        const reasoning = reasoningMatch ? reasoningMatch[1].trim() : content;
        // 総計を抽出
        const calculationMatch = content.match(/総計：(.*?)(?=point:|$)/);
        const calculation = calculationMatch ? calculationMatch[1].trim() : '';
        // 点数を抽出
        const pointMatch = content.match(/point:\s*(\d+)/);
        const finalScore = pointMatch ? parseInt(pointMatch[1]) : 0;
        // 計算式から各項目の点数を推定（簡易的な実装）
        const parts = calculation.split('=')[0].trim();
        const numbers = parts.match(/-?\d+/g) || [];
        const famousAuthorScore = numbers[0] ? parseInt(numbers[0]) : 1;
        const firstAuthorScore = numbers[1] ? parseInt(numbers[1]) : 1;
        const innovationScore = numbers[2] ? parseInt(numbers[2]) : 1;
        const applicabilityScore = numbers[3] ? parseInt(numbers[3]) : 1;
        const baseTotal = famousAuthorScore + firstAuthorScore + innovationScore + applicabilityScore;
        // ボーナス・ペナルティを推定
        let learningExperimentBonus = 0;
        let trendyTopicBonus = 0;
        let softwareEngineeringPenalty = 0;
        let logicPenalty = 0;
        if (numbers.length > 4) {
            for(let i = 4; i < numbers.length; i++){
                const num = parseInt(numbers[i]);
                if (num === 3) {
                    if (learningExperimentBonus === 0) learningExperimentBonus = 3;
                    else trendyTopicBonus = 3;
                } else if (num === -5) {
                    softwareEngineeringPenalty = -5;
                } else if (num === -4) {
                    logicPenalty = -4;
                }
            }
        }
        const evaluation = {
            famousAuthorScore,
            firstAuthorScore,
            innovationScore,
            applicabilityScore,
            baseTotal,
            learningExperimentBonus,
            trendyTopicBonus,
            softwareEngineeringPenalty,
            logicPenalty,
            finalScore,
            reasoning
        };
        const formattedOutput = {
            reasoning,
            calculation,
            point: finalScore
        };
        return {
            evaluation,
            formattedOutput
        };
    }
    /**
   * 単一論文を評価（後方互換性のため）
   */ async evaluatePaper(arxivUrl) {
        const paperInfo = await this.fetchPaperInfo(arxivUrl);
        return await this.evaluatePaperWithOpenAI(paperInfo);
    }
    /**
   * 指定日付の論文リストを評価
   */ async evaluatePapersByDate(date) {
        const papers = await this.fetchPapersByDate(date);
        const results = [];
        for (const paper of papers){
            try {
                const { evaluation, formattedOutput } = await this.evaluatePaperWithOpenAI(paper);
                results.push({
                    paper,
                    evaluation,
                    formattedOutput
                });
                // API制限を考慮して少し待機
                await new Promise((resolve)=>setTimeout(resolve, 1000));
            } catch (error) {
                console.warn(`Failed to evaluate paper ${paper.arxivId}:`, error);
            }
        }
        return results;
    }
}
}),
"[project]/src/app/api/evaluate/route.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "GET": ()=>GET,
    "POST": ()=>POST
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$paperEvaluator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/paperEvaluator.ts [app-route] (ecmascript)");
;
;
async function GET() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        message: 'Arxiv Papers Evaluation by Date API',
        usage: 'POST with { "date": "YYYY-MM-DD" }',
        description: 'Evaluates papers from cs.AI, cs.CV, cs.LG categories for the specified date'
    });
}
async function POST(request) {
    try {
        const body = await request.json();
        const { date } = body;
        if (!date) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                error: 'date is required (format: YYYY-MM-DD)'
            }, {
                status: 400
            });
        }
        // 日付形式の検証
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD'
            }, {
                status: 400
            });
        }
        const evaluator = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$paperEvaluator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ArxivPaperEvaluator"]();
        const results = await evaluator.evaluatePapersByDate(date);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            date,
            totalPapers: results.length,
            results: results.map((result)=>({
                    paper: result.paper,
                    evaluation: result.evaluation,
                    formattedOutput: result.formattedOutput
                }))
        });
    } catch (error) {
        console.error('Error evaluating papers by date:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            date: '',
            totalPapers: 0,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }, {
            status: 500
        });
    }
}
}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__79d4a93d._.js.map