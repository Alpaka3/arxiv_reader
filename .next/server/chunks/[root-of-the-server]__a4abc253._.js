module.exports = {

"[project]/.next-internal/server/app/api/evaluate-with-articles/route/actions.js [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {

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
"[project]/src/lib/articleGenerator.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "PaperArticleGenerator": ()=>PaperArticleGenerator
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
class PaperArticleGenerator {
    openai;
    constructor(){
        this.openai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_API_BASE
        });
    }
    /**
   * 論文の解説記事を生成する
   */ async generateArticle(paperInfo, evaluation) {
        const prompt = `以下の論文について、一般読者にも理解しやすい解説記事を生成してください。

論文情報:
タイトル: ${paperInfo.title}
著者: ${paperInfo.authors.join(', ')}
arXiv ID: ${paperInfo.arxivId}
カテゴリ: ${paperInfo.subjects.join(', ')}
Abstract: ${paperInfo.abstract}

評価情報:
最終スコア: ${evaluation.finalScore}点
評価理由: ${evaluation.reasoning}

以下の構成で記事を生成してください:

## TL;DR
(論文の要点を2-3行で簡潔にまとめる)

## 背景・目的
(この研究が行われた背景と目的を300字程度で説明)

## この論文の良いところ
(論文の革新性や貢献度について200字程度で説明)

## 論文の内容
(論文の手法や実験結果について400字程度で詳しく説明)

## 考察
(論文の意義や限界、今後の展望について300字程度で考察)

## 結論・まとめ
(論文の重要性と実用性について200字程度でまとめ)

各セクションは明確に区切り、技術的な内容も一般の読者が理解できるよう平易な言葉で説明してください。`;
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4.1-mini',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });
            const content = completion.choices[0].message.content || '';
            return this.parseArticleContent(content, paperInfo);
        } catch (error) {
            throw new Error(`Failed to generate article: ${error}`);
        }
    }
    /**
   * 生成されたコンテンツを構造化データに変換
   */ parseArticleContent(content, paperInfo) {
        const sections = {
            tldr: this.extractSection(content, 'TL;DR', '背景・目的'),
            background: this.extractSection(content, '背景・目的', 'この論文の良いところ'),
            goodPoints: this.extractSection(content, 'この論文の良いところ', '論文の内容'),
            content: this.extractSection(content, '論文の内容', '考察'),
            consideration: this.extractSection(content, '考察', '結論・まとめ'),
            conclusion: this.extractSection(content, '結論・まとめ', null)
        };
        return {
            paperId: paperInfo.arxivId,
            title: `【論文解説】${paperInfo.title}`,
            tldr: sections.tldr || 'TL;DRセクションの抽出に失敗しました。',
            background: sections.background || '背景・目的セクションの抽出に失敗しました。',
            goodPoints: sections.goodPoints || '良いところセクションの抽出に失敗しました。',
            content: sections.content || '内容セクションの抽出に失敗しました。',
            consideration: sections.consideration || '考察セクションの抽出に失敗しました。',
            conclusion: sections.conclusion || '結論セクションの抽出に失敗しました。',
            generatedAt: new Date().toISOString()
        };
    }
    /**
   * コンテンツから特定のセクションを抽出
   */ extractSection(content, startMarker, endMarker) {
        const startRegex = new RegExp(`##\\s*${startMarker}[\\s\\S]*?\\n([\\s\\S]*?)(?=##|$)`, 'i');
        const match = content.match(startRegex);
        if (!match) return '';
        let sectionContent = match[1].trim();
        if (endMarker) {
            const endRegex = new RegExp(`##\\s*${endMarker}`, 'i');
            const endMatch = sectionContent.search(endRegex);
            if (endMatch !== -1) {
                sectionContent = sectionContent.substring(0, endMatch).trim();
            }
        }
        return sectionContent;
    }
    /**
   * 複数の論文に対して記事を生成
   */ async generateArticlesForPapers(paperResults) {
        const articles = [];
        for (const result of paperResults){
            try {
                console.log(`Generating article for paper: ${result.paper.arxivId}`);
                const article = await this.generateArticle(result.paper, result.evaluation);
                articles.push({
                    paper: result.paper,
                    article,
                    evaluation: result.evaluation
                });
                // API制限を考慮して待機
                await new Promise((resolve)=>setTimeout(resolve, 2000));
            } catch (error) {
                console.warn(`Failed to generate article for paper ${result.paper.arxivId}:`, error);
            }
        }
        return articles;
    }
    /**
   * MCP連携用のブログポスト形式に変換（将来の拡張用）
   */ async convertToBlogPost(articleResult) {
        const { paper, article, evaluation } = articleResult;
        const blogContent = `${article.tldr}

## 背景・目的
${article.background}

## この論文の良いところ
${article.goodPoints}

## 論文の内容
${article.content}

## 考察
${article.consideration}

## 結論・まとめ
${article.conclusion}

---
**論文情報**
- タイトル: ${paper.title}
- 著者: ${paper.authors.join(', ')}
- arXiv ID: ${paper.arxivId}
- 評価スコア: ${evaluation.finalScore}点`;
        return {
            id: `paper-${paper.arxivId}-${Date.now()}`,
            title: article.title,
            content: blogContent,
            tags: [
                '論文解説',
                ...paper.subjects,
                `score-${evaluation.finalScore}`
            ],
            status: 'draft',
            metadata: {
                paperInfo: paper,
                evaluationScore: evaluation.finalScore
            }
        };
    }
    /**
   * 記事のプレビュー用HTML生成
   */ generateArticleHTML(article) {
        return `
<article class="paper-article">
  <header>
    <h1>${article.title}</h1>
    <p class="meta">生成日時: ${new Date(article.generatedAt).toLocaleString('ja-JP')}</p>
  </header>
  
  <section class="tldr">
    <h2>TL;DR</h2>
    <p>${article.tldr}</p>
  </section>
  
  <section class="background">
    <h2>背景・目的</h2>
    <p>${article.background}</p>
  </section>
  
  <section class="good-points">
    <h2>この論文の良いところ</h2>
    <p>${article.goodPoints}</p>
  </section>
  
  <section class="content">
    <h2>論文の内容</h2>
    <p>${article.content}</p>
  </section>
  
  <section class="consideration">
    <h2>考察</h2>
    <p>${article.consideration}</p>
  </section>
  
  <section class="conclusion">
    <h2>結論・まとめ</h2>
    <p>${article.conclusion}</p>
  </section>
</article>`;
    }
}
}),
"[project]/src/lib/paperEvaluator.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "ArxivPaperEvaluator": ()=>ArxivPaperEvaluator
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$articleGenerator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/articleGenerator.ts [app-route] (ecmascript)");
;
;
class ArxivPaperEvaluator {
    openai;
    articleGenerator;
    constructor(){
        this.openai = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_API_BASE
        });
        this.articleGenerator = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$articleGenerator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PaperArticleGenerator"]();
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
   */ async fetchPapersByDate(date, isDebugMode = true) {
        const categories = [
            'cs.AI',
            'cs.CV',
            'cs.LG'
        ];
        const papers = [];
        const maxPapersPerCategory = isDebugMode ? 3 : Infinity;
        for (const category of categories){
            let start = 0;
            let keepFetching = true;
            let categoryCount = 0;
            while(keepFetching && categoryCount < maxPapersPerCategory){
                try {
                    const apiUrl = `http://export.arxiv.org/api/query?search_query=cat:${category}&start=${start}&max_results=100&sortBy=submittedDate&sortOrder=descending`;
                    const response = await fetch(apiUrl);
                    if (!response.ok) {
                        console.warn(`Failed to fetch papers for category ${category}`);
                        break;
                    }
                    const xmlText = await response.text();
                    const entryMatches = [
                        ...xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g)
                    ];
                    if (entryMatches.length === 0) break; // もうエントリがない＝終了
                    for (const entryMatch of entryMatches){
                        if (categoryCount >= maxPapersPerCategory) break;
                        const entryXml = entryMatch[1];
                        const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
                        if (!publishedMatch) continue;
                        const publishedDate = publishedMatch[1].split('T')[0];
                        if (publishedDate === date) {
                            console.log(`New entry for ${category}, count: ${categoryCount}`);
                            // 論文情報抽出
                            const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
                            const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
                            const idMatch = entryXml.match(/<id[^>]*>.*?\/([0-9]{4}\.[0-9]{4,5})(?:v[0-9]+)?<\/id>/);
                            const title = titleMatch ? titleMatch[1].trim() : '';
                            const abstract = summaryMatch ? summaryMatch[1].trim() : '';
                            const arxivId = idMatch ? idMatch[1] : '';
                            const authors = [];
                            const authorMatches = entryXml.matchAll(/<name[^>]*>(.*?)<\/name>/g);
                            for (const match of authorMatches){
                                const name = match[1].trim();
                                if (name) authors.push(name);
                            }
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
                                    publishedDate
                                });
                                categoryCount++;
                            }
                        } else if (publishedDate < date) {
                            // これより古い論文は対象外になるので終了
                            keepFetching = false;
                            break;
                        }
                    }
                    start += 100;
                    await new Promise((r)=>setTimeout(r, 1000)); // レート制限回避
                } catch (error) {
                    console.warn(`Error fetching papers for category ${category}:`, error);
                    break;
                }
            }
            console.log(`Category ${category}: found ${categoryCount} papers`);
        }
        console.log(`Total papers found: ${papers.length}`);
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
                // model: 'gpt-4.1-mini',
                model: 'gpt-4.1-nano',
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
   */ async evaluatePapersByDate(date, isDebugMode = true) {
        const papers = await this.fetchPapersByDate(date, isDebugMode);
        const results = [];
        console.log(`Starting evaluation of ${papers.length} papers...`);
        for (const paper of papers){
            try {
                const startTime = Date.now();
                const { evaluation, formattedOutput } = await this.evaluatePaperWithOpenAI(paper);
                const endTime = Date.now();
                const durationMs = endTime - startTime;
                console.log(`Evaluation of ${paper.arxivId} took ${durationMs} ms, score: ${formattedOutput.point}`);
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
        // 点数順にソートして上位3件のみを返す
        const sortedResults = results.sort((a, b)=>b.formattedOutput.point - a.formattedOutput.point);
        const top3Results = sortedResults.slice(0, 3);
        console.log(`Evaluation completed. Total evaluated: ${results.length}, returning top 3 results.`);
        console.log('Top 3 scores:', top3Results.map((r)=>r.formattedOutput.point));
        return top3Results;
    }
    /**
   * 指定日付の論文リストを評価し、上位3件の解説記事を生成
   */ async evaluatePapersWithArticles(date, isDebugMode = true) {
        // 論文評価を実行
        const results = await this.evaluatePapersByDate(date, isDebugMode);
        console.log(`Starting article generation for top ${results.length} papers...`);
        // 上位3件の論文について記事を生成
        const articleInputs = results.map((result)=>({
                paper: result.paper,
                evaluation: result.evaluation
            }));
        const articles = await this.articleGenerator.generateArticlesForPapers(articleInputs);
        console.log(`Article generation completed. Generated ${articles.length} articles.`);
        return {
            results,
            articles
        };
    }
}
}),
"[project]/src/app/api/evaluate-with-articles/route.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "POST": ()=>POST
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$paperEvaluator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/paperEvaluator.ts [app-route] (ecmascript)");
;
;
async function POST(request) {
    try {
        const { date, debugMode = true } = await request.json();
        if (!date) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                date: '',
                totalPapers: 0,
                error: '日付が指定されていません'
            });
        }
        const evaluator = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$paperEvaluator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ArxivPaperEvaluator"]();
        const { results, articles } = await evaluator.evaluatePapersWithArticles(date, debugMode);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            date,
            totalPapers: results.length,
            results,
            articles
        });
    } catch (error) {
        console.error('Error in evaluate-with-articles API:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            date: '',
            totalPapers: 0,
            error: `評価中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__a4abc253._.js.map