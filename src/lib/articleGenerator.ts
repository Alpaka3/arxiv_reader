import OpenAI from 'openai';
import { PaperInfo, EvaluationResult, PaperArticle, ArticleGenerationResult, BlogPost } from './types';

export class PaperArticleGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE,
    });
  }

  /**
   * 論文の解説記事を生成する
   */
  async generateArticle(paperInfo: PaperInfo, evaluation: EvaluationResult): Promise<PaperArticle> {
    const prompt = `以下の論文について、技術的に詳細で包括的な解説記事を生成してください。

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
(論文の手法、アルゴリズム、実験結果について4000字前後で詳しく説明。以下の要素を必ず含めてください：

### 提案手法の詳細
- アルゴリズムの具体的な手順
- 重要な数式をLaTeX形式で記述（例：$L = \sum_{i=1}^{n} \log p(y_i|x_i)$）
- モデルアーキテクチャの詳細説明

### 技術的革新点
- 従来手法との具体的な違い
- 新規性のある技術要素
- 計算効率や性能向上の仕組み

### 実験設定と結果
- データセットの詳細（データサイズ、特徴量、前処理など）
- 評価指標と実験条件（ハイパーパラメータ、計算環境など）
- 定量的結果の詳細分析（精度、速度、メモリ使用量など）
- 図表への具体的な言及を必ず含める：
  * 「Figure 1に示すアーキテクチャでは...」
  * 「Table 2の結果から、提案手法は従来手法と比較して...」
  * 「Figure 3のグラフが示すように...」
  * 「Algorithm 1の疑似コードに従って...」
- 実験結果の統計的分析（信頼区間、有意性検定など）

### 比較分析
- ベースライン手法との性能比較
- アブレーション研究の結果
- 統計的有意性の検証

専門的な内容も含めつつ、数式や図表を積極的に引用して技術的な深さを持たせてください。)

## 考察
(論文の意義や限界、今後の展望について300字程度で考察)

## 結論・まとめ
(論文の重要性と実用性について200字程度でまとめ)

重要：「論文の内容」セクションは特に詳細に記述し、数式、アルゴリズム、図表への言及を積極的に含めてください。技術者や研究者が読んでも満足できる深さを目指してください。

記述例：
- 数式: 「損失関数は $L = \sum_{i=1}^{n} \ell(f(x_i), y_i)$ で定義され...」
- 図表引用: 「Figure 2に示すように、提案手法のアーキテクチャは...」「Table 1の実験結果から、精度が15%向上していることがわかる」
- アルゴリズム: 「Algorithm 1の疑似コードに従って、まず入力データを...」
- 技術詳細: 「Attention機構において、クエリ $Q$、キー $K$、バリュー $V$ の計算は...」

論文の内容セクションでは、これらの要素を自然に組み込んで、技術的な深さと理解しやすさの両方を実現してください。`;

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
          max_tokens: 6000
        });

      const content = completion.choices[0].message.content || '';
      return this.parseArticleContent(content, paperInfo);

    } catch (error) {
      throw new Error(`Failed to generate article: ${error}`);
    }
  }

  /**
   * 生成されたコンテンツを構造化データに変換
   */
  private parseArticleContent(content: string, paperInfo: PaperInfo): PaperArticle {
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
   */
  private extractSection(content: string, startMarker: string, endMarker: string | null): string {
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
   */
  async generateArticlesForPapers(
    paperResults: Array<{paper: PaperInfo, evaluation: EvaluationResult}>
  ): Promise<ArticleGenerationResult[]> {
    const articles: ArticleGenerationResult[] = [];

    for (const result of paperResults) {
      try {
        console.log(`Generating article for paper: ${result.paper.arxivId}`);
        const article = await this.generateArticle(result.paper, result.evaluation);
        
        articles.push({
          paper: result.paper,
          article,
          evaluation: result.evaluation
        });

        // API制限を考慮して待機
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn(`Failed to generate article for paper ${result.paper.arxivId}:`, error);
      }
    }

    return articles;
  }

  /**
   * MCP連携用のブログポスト形式に変換（将来の拡張用）
   */
  async convertToBlogPost(articleResult: ArticleGenerationResult): Promise<BlogPost> {
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
   */
  generateArticleHTML(article: PaperArticle): string {
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