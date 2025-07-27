import OpenAI from 'openai';
import { PaperInfo, EvaluationResult, PaperArticle, ArticleGenerationResult, BlogPost } from './types';
import { Ar5ivParser } from './ar5ivParser';

export class PaperArticleGenerator {
  private openai: OpenAI;
  private ar5ivParser: Ar5ivParser;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE,
    });
    this.ar5ivParser = new Ar5ivParser();
  }

  /**
   * カテゴリに応じた特殊な図表を生成
   */
  private generateCategorySpecificFigures(subjects: string[]): string {
    let specificFigures = '';
    
    if (subjects.some(s => s.includes('CV') || s.includes('Computer Vision'))) {
      specificFigures += `
- Figure 5: 入力画像と出力結果の視覚的比較
- Figure 6: 注意機構のヒートマップ可視化
- Figure 7: 各層での特徴マップの可視化
- Table 4: 異なる画像サイズでの性能比較`;
    }
    
    if (subjects.some(s => s.includes('NLP') || s.includes('CL') || s.includes('LG'))) {
      specificFigures += `
- Figure 5: Attention重みの可視化
- Figure 6: 埋め込み空間でのクラスタリング結果
- Figure 7: 生成テキストの品質評価
- Table 4: 異なるドメインでの汎化性能`;
    }
    
    if (subjects.some(s => s.includes('AI') || s.includes('ML'))) {
      specificFigures += `
- Figure 5: 学習過程での損失関数の変化
- Figure 6: ハイパーパラメータの感度分析
- Figure 7: 計算時間とメモリ使用量の比較
- Table 4: 異なるデータサイズでのスケーラビリティ分析`;
    }
    
    return specificFigures || `
- Figure 5: 詳細な実験結果の可視化
- Figure 6: エラー分析とケーススタディ
- Table 4: 追加の実験結果`;
  }

  /**
   * 論文の内容セクション専用の詳細生成（実際の論文内容を使用）
   */
  private async generateDetailedContent(paperInfo: PaperInfo, evaluation: EvaluationResult): Promise<string> {
    // ar5ivから実際の論文内容を取得
    let realContent;
    let realFigures;
    try {
      console.log(`Fetching real content from ar5iv for ${paperInfo.arxivId}`);
      realContent = await this.ar5ivParser.getRealContent(paperInfo.arxivId);
      realFigures = await this.ar5ivParser.getRealFigureTableList(paperInfo.arxivId);
    } catch (error) {
      console.warn(`Failed to fetch ar5iv content for ${paperInfo.arxivId}:`, error);
      realContent = {
        abstract: paperInfo.abstract,
        methodology: '',
        experiments: '',
        results: '',
        fullSections: {}
      };
      realFigures = {
        figureList: '',
        tableList: '',
        equationSamples: '',
        algorithmList: ''
      };
    }

    const contentPrompt = `以下の論文について、「論文の内容」セクションのみを4000字以上で詳細に生成してください。

論文情報:
タイトル: ${paperInfo.title}
著者: ${paperInfo.authors.join(', ')}
arXiv ID: ${paperInfo.arxivId}
Abstract: ${paperInfo.abstract}

【実際の論文内容】:
Methodology: ${realContent.methodology}
Experiments: ${realContent.experiments}
Results: ${realContent.results}

【実際の図表リスト】:
Figures:
${realFigures.figureList || 'No figures detected'}

Tables:
${realFigures.tableList || 'No tables detected'}

Equations (samples):
${realFigures.equationSamples || 'No equations detected'}

Algorithms:
${realFigures.algorithmList || 'No algorithms detected'}

【重要】図表引用の必須要件：
上記の【実際の図表リスト】に記載されている図表を積極的に引用してください。図表が検出されない場合は、以下の典型的な図表があるものとして引用してください：

実際に検出された図表を優先的に使用：
${realFigures.figureList ? `実際のFigures: ${realFigures.figureList}` : ''}
${realFigures.tableList ? `実際のTables: ${realFigures.tableList}` : ''}
${realFigures.algorithmList ? `実際のAlgorithms: ${realFigures.algorithmList}` : ''}

フォールバック図表（実際の図表が検出されない場合）：
- Figure 1: システム全体のアーキテクチャ図またはモデル概要図
- Figure 2: 提案手法のフローチャートまたは概念図  
- Figure 3: 実験結果のグラフ（性能比較、学習曲線など）
- Table 1: データセットの詳細情報
- Table 2: 他手法との性能比較結果
- Algorithm 1: 提案手法の疑似コード

実際の論文内容（Methodology, Experiments, Results）を基に、具体的な数値やトレンドについて言及してください。

要求事項：
1. 論文の手法、アルゴリズム、実験結果について4000字以上で詳細に説明
2. 要約ではなく、論文に記載されている内容をそのまま詳細に記述
3. 以下の要素をすべて含め、特に図表引用を多用する：
   - 提案手法の具体的なアルゴリズム（Algorithm 1を参照）
   - 重要な数式（LaTeX形式：$...$または$$...$$）
   - アーキテクチャやモデル構造の詳細（Figure 1, Figure 2を参照）
   - 実験設定の詳細（Table 1のデータセット情報を参照）
   - 定量的結果の詳細分析（Figure 3, Table 2の結果を参照）
   - ベースライン手法との比較（Table 2の比較結果を詳述）
   - アブレーション研究の結果（Figure 4, Table 3を参照）

【図表引用の例】：
「Figure 1に示すシステムアーキテクチャでは...」
「Table 2の実験結果から、提案手法はベースライン手法と比較して精度が15.3%向上していることがわかる」
「Figure 3のグラフが示すように、提案手法の収束速度は...」
「Algorithm 1の疑似コードに従って、まず入力データを前処理し...」

重要：各段落で必ず図表への言及を含め、内容を途中で切らず、完全な技術解説を提供してください。`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'user',
            content: contentPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 6000
      });

      return completion.choices[0].message.content || '論文の内容セクションの生成に失敗しました。';
    } catch (error) {
      console.error('Error generating detailed content:', error);
      return '論文の内容セクションの生成中にエラーが発生しました。';
    }
  }

  /**
   * 論文の解説記事を生成する
   */
  async generateArticle(paperInfo: PaperInfo, evaluation: EvaluationResult): Promise<PaperArticle> {
    const prompt = `以下の論文について、要約ではなく論文の詳細な内容をそのまま解説する技術記事を生成してください。論文の内容を省略せず、具体的な手法、実験、結果をすべて含めてください。

論文情報:
タイトル: ${paperInfo.title}
著者: ${paperInfo.authors.join(', ')}
arXiv ID: ${paperInfo.arxivId}
カテゴリ: ${paperInfo.subjects.join(', ')}
Abstract: ${paperInfo.abstract}

評価情報:
最終スコア: ${evaluation.finalScore}点
評価理由: ${evaluation.reasoning}

注意：この記事は論文の要約ではありません。論文の内容を詳細に、省略せずに解説してください。

以下の構成で記事を生成してください:

## TL;DR
(論文の要点を2-3行で簡潔にまとめる)

## 背景・目的
(この研究が行われた背景と目的を300字程度で説明)

## この論文の良いところ
(論文の革新性や貢献度について200字程度で説明)

## 論文の内容
(論文の手法、アルゴリズム、実験結果について4000字以上で詳しく説明。要約ではなく、論文に記載されている内容をそのまま詳細に記述してください。以下の要素を必ず含めてください：

### 提案手法の詳細
- アルゴリズムの具体的な手順
- 重要な数式をLaTeX形式で記述（例：$L = \sum_{i=1}^{n} \log p(y_i|x_i)$）
- モデルアーキテクチャの詳細説明

### 技術的革新点
- 従来手法との具体的な違い
- 新規性のある技術要素
- 計算効率や性能向上の仕組み

### 実験設定と結果
- データセットの詳細（Table 1に示すデータサイズ、特徴量、前処理など）
- 評価指標と実験条件（ハイパーパラメータ、計算環境など）
- 定量的結果の詳細分析（Figure 3の性能グラフ、Table 2の精度比較など）
- 図表への具体的な言及を必ず各段落で含める：
  * 「Figure 1に示すシステムアーキテクチャでは、入力層から出力層まで...」
  * 「Table 2の実験結果から、提案手法はベースライン手法と比較して精度が○○%向上...」
  * 「Figure 3のグラフが示すように、学習曲線は○○エポック後に収束し...」
  * 「Algorithm 1の疑似コードに従って、まず入力データを前処理し、次に...」
  * 「Figure 4のアブレーション研究では、各コンポーネントの効果が...」
- 実験結果の統計的分析（信頼区間、有意性検定、Figure 5の統計グラフなど）

### 比較分析
- ベースライン手法との性能比較
- アブレーション研究の結果
- 統計的有意性の検証

専門的な内容も含めつつ、数式や図表を積極的に引用して技術的な深さを持たせてください。)

## 考察
(論文の意義や限界、今後の展望について300字程度で考察)

## 結論・まとめ
(論文の重要性と実用性について200字程度でまとめ)

重要指示：
1. 「論文の内容」セクションは4000字以上で詳細に記述してください
2. 論文の内容を要約せず、具体的な手法、実験、結果をすべて含めてください
3. 数式、アルゴリズム、図表への言及を積極的に含めてください
4. 各セクション、特に「論文の内容」セクションを完全に書き切ってください
5. 途中で内容を省略したり、「...」で終わらせたりしないでください

記述例：
- 数式: 「損失関数は $L = \sum_{i=1}^{n} \ell(f(x_i), y_i)$ で定義され...」
- 図表引用: 「Figure 2に示すように、提案手法のアーキテクチャは...」「Table 1の実験結果から、精度が15%向上していることがわかる」
- アルゴリズム: 「Algorithm 1の疑似コードに従って、まず入力データを...」
- 技術詳細: 「Attention機構において、クエリ $Q$、キー $K$、バリュー $V$ の計算は...」

必須：すべてのセクションを完全に記述し、特に「論文の内容」セクションは論文の詳細な技術的内容を省略なく含めてください。記事が途中で終わらないよう、各セクションを完結させてください。`;

                try {
        // まず基本的な記事構造を生成（論文の内容セクション以外）
        const basicCompletion = await this.openai.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        });

        const basicContent = basicCompletion.choices[0].message.content || '';
        
        // 詳細な論文の内容セクションを別途生成
        console.log(`Generating detailed content for paper: ${paperInfo.arxivId}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // API制限対策
        const detailedContent = await this.generateDetailedContent(paperInfo, evaluation);
        
        // 基本記事の「論文の内容」セクションを詳細版に置き換え
        const enhancedContent = this.replaceContentSection(basicContent, detailedContent);
        
        return this.parseArticleContent(enhancedContent, paperInfo);

    } catch (error) {
      throw new Error(`Failed to generate article: ${error}`);
    }
  }

  /**
   * 基本記事の論文の内容セクションを詳細版に置き換え
   */
  private replaceContentSection(basicContent: string, detailedContent: string): string {
    // 論文の内容セクションを見つけて置き換え
    const contentSectionRegex = /## 論文の内容[\s\S]*?(?=## |$)/;
    const replacementSection = `## 論文の内容\n${detailedContent}\n\n`;
    
    if (contentSectionRegex.test(basicContent)) {
      return basicContent.replace(contentSectionRegex, replacementSection);
    } else {
      // セクションが見つからない場合は、考察セクションの前に挿入
      const considerationIndex = basicContent.indexOf('## 考察');
      if (considerationIndex !== -1) {
        return basicContent.slice(0, considerationIndex) + replacementSection + basicContent.slice(considerationIndex);
      } else {
        // 考察セクションも見つからない場合は最後に追加
        return basicContent + '\n\n' + replacementSection;
      }
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