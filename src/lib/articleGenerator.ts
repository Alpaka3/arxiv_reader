import OpenAI from 'openai';
import { PaperInfo, EvaluationResult, PaperArticle, ArticleGenerationResult, BlogPost } from './types';
import { ArxivHtmlParser } from './arxivHtmlParser';

export class PaperArticleGenerator {
  private openai: OpenAI;
  private htmlParser: ArxivHtmlParser;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE,
    });
    this.htmlParser = new ArxivHtmlParser();
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
    // HTMLから実際の論文内容を取得（環境変数でスキップ可能）
    let realContent;
    const skipHtmlParsing = process.env.SKIP_HTML_PARSING === 'true';
    
    if (skipHtmlParsing) {
      console.log(`HTML parsing is disabled, using abstract-based generation for ${paperInfo.arxivId}`);
      realContent = {
        methodology: 'HTML parsing disabled - using abstract-based generation',
        experiments: 'HTML parsing disabled - using abstract-based generation',
        results: 'HTML parsing disabled - using abstract-based generation',
        figureList: '',
        tableList: '',
        equationList: ''
      };
    } else {
      try {
        console.log(`Fetching real content from HTML for ${paperInfo.arxivId}`);
        realContent = await this.htmlParser.getPaperSummary(paperInfo.arxivId);
        console.log(`HTML content extracted successfully for ${paperInfo.arxivId}`);
      } catch (error) {
        console.warn(`Failed to fetch HTML content for ${paperInfo.arxivId}, using fallback:`, error);
        realContent = {
          methodology: 'HTML parsing failed - using abstract-based generation',
          experiments: 'HTML parsing failed - using abstract-based generation',
          results: 'HTML parsing failed - using abstract-based generation',
          figureList: '',
          tableList: '',
          equationList: ''
        };
      }
    }

    const contentPrompt = `以下の論文について、「論文の内容」セクションのみを4000字以上で詳細に生成してください。

論文情報:
タイトル: ${paperInfo.title}
著者: ${paperInfo.authors.join(', ')}
arXiv ID: ${paperInfo.arxivId}
Abstract: ${paperInfo.abstract}

【実際の論文内容】:
${realContent.methodology.includes('HTML parsing') 
  ? `HTML解析が利用できないため、以下のAbstractを基に詳細な技術解説を生成してください：
Abstract: ${paperInfo.abstract}

注意：実際の論文内容は利用できませんが、Abstractの情報から論理的に推測される手法、実験設定、結果について詳細に記述してください。`
  : `Methodology: ${realContent.methodology}
Experiments: ${realContent.experiments}
Results: ${realContent.results}`}

【実際の図表リスト】:
${realContent.figureList || realContent.tableList || realContent.equationList 
  ? `Figures:
${realContent.figureList || 'No figures detected'}

Tables:
${realContent.tableList || 'No tables detected'}

Equations (samples):
${realContent.equationList || 'No equations detected'}`
  : `HTML解析により図表情報を取得できませんでした。論文の分野（${paperInfo.subjects.join(', ')}）に基づいて、典型的な図表を推測して引用してください。`}

【重要】図表引用の必須要件：
上記の【実際の図表リスト】に記載されている図表を積極的に引用してください。図表が検出されない場合は、以下の典型的な図表があるものとして引用してください：

実際に検出された図表を優先的に使用：
${realContent.figureList ? `実際のFigures: ${realContent.figureList}` : ''}
${realContent.tableList ? `実際のTables: ${realContent.tableList}` : ''}

フォールバック図表（実際の図表が検出されない場合）：
- Figure 1: システム全体のアーキテクチャ図またはモデル概要図
- Figure 2: 提案手法のフローチャートまたは概念図  
- Figure 3: 実験結果のグラフ（性能比較、学習曲線など）
- Table 1: データセットの詳細情報
- Table 2: 他手法との性能比較結果
- Algorithm 1: 提案手法の疑似コード

実際の論文内容（Methodology, Experiments, Results）を基に、具体的な数値やトレンドについて言及してください。

要求事項：
1. 論文の手法、アルゴリズム、実験結果について2000字以上で詳細に説明
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

重要指示：
1. 4000字以上の詳細な技術解説を必ず完成させてください
2. 記事を途中で終わらせず、必ず最後まで書き切ってください
3. 各段落で図表への言及を含めてください
4. 「...」や省略表現は一切使用しないでください
5. 記事の最後は適切な結論で締めくくってください
6. 出力はMarkdown形式で記述してください（後でHTML形式に変換されます）

【記事構成の指示】
以下の順序で必ず全てのセクションを含めてください：
- 提案手法の詳細説明
- アーキテクチャの詳細
- 技術的革新点
- 実験設定と結果
- 比較分析
- 結論

記事を途中で止めず、完全な技術解説として仕上げてください。`;

          try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o', // より強力なモデルを使用
          messages: [
            {
              role: 'system',
              content: '你是一个专业的学术论文解说专家，擅长生成详细、完整的技术解说文章。你必须确保生成的内容完整且不会中途截断。'
            },
            {
              role: 'user',
              content: contentPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 16000 // さらにトークン数を増加
        });

        const content = completion.choices[0].message.content || '論文の内容セクションの生成に失敗しました。';
        // // レスポンスが途中で切れていないかチェック
        // if (completion.choices[0].finish_reason === 'length') {
        //   console.warn(`Content was truncated for paper ${paperInfo.arxivId}, attempting continuation...`);
        //   // 継続生成を試行
        //   const continuationContent = await this.continueContentGeneration(content, paperInfo);
        //   console.log("$$$$$$$$$$$ DEBUG ###################");
        //   console.log("$$$$$$$$$$$ DEBUG ###################");
        //   console.log(continuationContent);
        //   console.log("$$$$$$$$$$$ DEBUG ###################");
        //   console.log("$$$$$$$$$$$ DEBUG ###################");
        //   return content + continuationContent;
        // }
        
        return content;
    } catch (error) {
      console.error('Error generating detailed content:', error);
      return '論文の内容セクションの生成中にエラーが発生しました。';
    }
  }

  /**
   * 論文の解説記事を生成する
   */
  async generateArticle(paperInfo: PaperInfo, evaluation: EvaluationResult): Promise<string> {
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
注意：セクション名（背景・目的など）は省略したり変更せずにそのまま出力してください。見出しのレベル（##など）も変更しないでください。


以下の構成で記事を生成してください:

## TL;DR
(論文の要点を2-3行で簡潔にまとめる)

## 背景・目的
(この研究が行われた背景と目的を300字程度で説明)

## この論文の良いところ
(論文の革新性や貢献度について200字程度で説明)

## 論文の内容
(論文の手法、アルゴリズム、実験結果について2000字以上で詳しく説明。要約ではなく、論文に記載されている内容をそのまま詳細に記述してください。以下の要素を必ず含めてください：

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
          max_tokens: 16000
        });

        const basicContent = basicCompletion.choices[0].message.content || '';
        
        // 詳細な論文の内容セクションを別途生成
        console.log(`Generating detailed content for paper: ${paperInfo.arxivId}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // API制限対策
        const detailedContent = await this.generateDetailedContent(paperInfo, evaluation);
        
        // 基本記事の「論文の内容」セクションを詳細版に置き換え
        const enhancedContent = await this.replaceContentSection(basicContent, detailedContent);
        // const enhancedContent = basicContent;
        
        return enhancedContent;

    } catch (error) {
      throw new Error(`Failed to generate article: ${error}`);
    }
  }

  /**
   * 途中で切れたコンテンツの継続生成
   */
  private async continueContentGeneration(previousContent: string, paperInfo: PaperInfo): Promise<string> {
    const continuationPrompt = `以下は論文「${paperInfo.title}」の解説記事の途中までの内容です。この続きを生成して、記事を完成させてください。

途中までの内容:
${previousContent.slice(-1000)} // 最後の1000文字を含める

要求事項:
1. 上記の内容の自然な続きを生成してください
2. 論文の内容セクションを完全に完結させてください
3. 図表への言及を継続してください
4. 最低でも1000字以上の続きを生成してください
5. 記事が途中で終わらないよう、適切な結論で締めくくってください

重要：前の内容と重複しないよう、続きの部分のみを生成してください。`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你必须完成这篇技术解说文章，确保内容完整且有适当的结论。'
          },
          {
            role: 'user',
            content: continuationPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 16000
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating continuation:', error);
      return '\n\n[記事の続きの生成に失敗しました。上記の内容で記事は終了です。]';
    }
  }

  /**
   * 基本記事の論文の内容セクションを詳細版に置き換え
   */
  private async replaceContentSection(basicContent: string, detailedContent: string): Promise<string> {
    
    // OpenAI APIを使ってMarkdownからHTMLに変換
    const htmlConversionPrompt = `以下のMarkdown形式のテキストを、適切なHTML形式に変換してください。

Markdownテキスト:
${detailedContent}

要求事項:
1. Markdownの構文（見出し、リスト、強調、リンク、コードブロックなど）を適切なHTMLタグに変換
2. 数式（$...$や$$...$$）はそのまま保持
3. 図表への言及（Figure 1、Table 2など）も保持
4. HTMLタグのみを出力し、余計な説明は不要
5. 段落は<p>タグで囲む
6. 見出しは適切なレベルの<h>タグに変換

HTML形式で出力してください:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたはMarkdownからHTMLへの変換を専門とするアシスタントです。正確で適切なHTML形式に変換してください。'
          },
          {
            role: 'user',
            content: htmlConversionPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 16000
      });

      const htmlContent = completion.choices[0].message.content || detailedContent;
      console.log("converted to HTML:", htmlContent);
      
      // 論文の内容セクションを見つけて置き換え
      // const contentSectionRegex = /## 論文の内容[\s\S]*?(?=## |$)/;
      const contentSectionRegex = /## 論文の内容[\s\S]*?(?=^##\s|\Z)/m;
      const replacementSection = `## 論文の内容\n${htmlContent}\n\n`;
      
      if (contentSectionRegex.test(basicContent)) {
        return basicContent.replace(contentSectionRegex, replacementSection);
      // } else {
      //   // セクションが見つからない場合は、考察セクションの前に挿入
      //   const considerationIndex = basicContent.indexOf('## 考察');
      //   if (considerationIndex !== -1) {
      //     return basicContent.slice(0, considerationIndex) + replacementSection + basicContent.slice(considerationIndex);
      //   } else {
      //     // 考察セクションも見つからない場合は最後に追加
      //     return basicContent + '\n\n' + replacementSection;
      //   }
      }
    } catch (error) {
      console.error('Error converting Markdown to HTML:', error);
      // エラーの場合は元のMarkdownコンテンツをそのまま使用
      const contentSectionRegex = /## 論文の内容[\s\S]*?(?=## |$)/;
      const replacementSection = `## 論文の内容\n${detailedContent}\n\n`;
      
      if (contentSectionRegex.test(basicContent)) {
        return basicContent.replace(contentSectionRegex, replacementSection);
      } else {
        const considerationIndex = basicContent.indexOf('## 考察');
        if (considerationIndex !== -1) {
          return basicContent.slice(0, considerationIndex) + replacementSection + basicContent.slice(considerationIndex);
        } else {
          return basicContent + '\n\n' + replacementSection;
        }
      }
    }
  }

  /**
   * 論文の内容からFigure言及を抽出してimg tagを埋め込む
   */
  private async embedFiguresInContent(content: string, figures: Array<{figureNumber: string; caption: string; imageUrl?: string}>): Promise<string> {
    if (!figures || figures.length === 0) {
      console.log('No figures available for embedding');
      return content;
    }

    let processedContent = content;
    
    try {
      // Figure言及のパターンを検索（Figure 1, Fig. 2, Figure 3など）
      const figureReferences = content.match(/(Figure\s+\d+|Fig\.\s*\d+)/gi) || [];
      
      console.log(`Found figure references in content: ${figureReferences.join(', ')}`);
      
      if (figureReferences.length === 0) {
        console.log('No figure references found in content');
        return content;
      }
      
      // 重複を除去し、正規化
      const uniqueReferences = [...new Set(figureReferences.map(ref => 
        ref.replace(/Fig\.\s*/i, 'Figure ').replace(/\s+/g, ' ')
      ))];
      
      console.log(`Processing unique figure references: ${uniqueReferences.join(', ')}`);
      
      for (const figureRef of uniqueReferences) {
        // 対応するFigureデータを検索
        const figureData = figures.find(fig => 
          fig.figureNumber.toLowerCase().trim() === figureRef.toLowerCase().trim()
        );
        
        if (figureData && figureData.imageUrl) {
          // Figure言及の直後にimg tagを挿入（最初の出現のみ）
          const figurePattern = new RegExp(`(${figureRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![^<]*<\/div>)`, 'i');
          
          const figureHtml = `$1

<div class="figure-embed" style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
  <img src="${figureData.imageUrl}" alt="${figureData.figureNumber}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.nextElementSibling.innerHTML='<span style=\\"color: #999;\\">${figureData.imageUrl}</span>'" 
  <p style="margin: 10px 0 0 0; font-size: 14px; color: #666; font-style: italic;">
    <strong>${figureData.figureNumber}:</strong> ${figureData.caption}
  </p>
</div>`;
          
          processedContent = processedContent.replace(figurePattern, figureHtml);
          console.log(`Embedded ${figureData.figureNumber} with URL: ${figureData.imageUrl}`);
        } else {
          console.log(`No image found for ${figureRef} (available figures: ${figures.map(f => f.figureNumber).join(', ')})`);
        }
      }
      
    } catch (error) {
      console.error('Error embedding figures in content:', error);
    }
    
    return processedContent;
  }

  /**
   * 生成されたコンテンツを構造化データに変換
   */
  private async parseArticleContent(content: string, paperInfo: PaperInfo): Promise<PaperArticle> {
    const sections = {
      tldr: this.extractSection(content, 'TL;DR', '背景・目的'),
      background: this.extractSection(content, '背景・目的', 'この論文の良いところ'),
      goodPoints: this.extractSection(content, 'この論文の良いところ', '論文の内容'),
      content: this.extractSection(content, '論文の内容', '考察'),
      consideration: this.extractSection(content, '考察', '結論・まとめ'),
      conclusion: this.extractSection(content, '結論・まとめ', null)
    };

    // 図や表の情報を取得
    let figures: Array<{figureNumber: string; caption: string; imageUrl?: string;}> = [];
    let tables: Array<{tableNumber: string; caption: string; content: string; structuredData?: any}> = [];
    
    try {
      const skipHtmlParsing = process.env.SKIP_HTML_PARSING === 'true';
      if (!skipHtmlParsing) {
        const htmlContent = await this.htmlParser.parsePaper(paperInfo.arxivId);
        figures = htmlContent.figures;
        tables = htmlContent.tables;
        console.log(`Extracted ${figures.length} figures and ${tables.length} tables for ${paperInfo.arxivId}`);
      }
    } catch (error) {
      console.warn(`Failed to extract figures and tables for ${paperInfo.arxivId}:`, error);
    }

    // 論文の内容セクションにFigureを埋め込む
    let processedContent = sections.content || '内容セクションの抽出に失敗しました。';
    if (figures.length > 0) {
      processedContent = await this.embedFiguresInContent(processedContent, figures);
    }

    return {
      paperId: paperInfo.arxivId,
      title: `【論文解説】${paperInfo.title}`,
      tldr: sections.tldr || 'TL;DRセクションの抽出に失敗しました。',
      background: sections.background || '背景・目的セクションの抽出に失敗しました。',
      goodPoints: sections.goodPoints || '良いところセクションの抽出に失敗しました。',
      content: processedContent,
      consideration: sections.consideration || '考察セクションの抽出に失敗しました。',
      conclusion: sections.conclusion || '結論セクションの抽出に失敗しました。',
      generatedAt: new Date().toISOString(),
      figures: figures,
      tables: tables
    };
  }

  /**
   * コンテンツから特定のセクションを抽出
   */
  private extractSection(content: string, startMarker: string, endMarker: string | null): string {
    // エスケープ処理（正規表現用）
    const escape = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
    const start = escape(startMarker);
    const end = endMarker ? escape(endMarker) : null;
  
    const regex = end
      ? new RegExp(`##\\s*${start}\\s*\\n([\\s\\S]*?)##\\s*${end}`, 'i')
      : new RegExp(`##\\s*${start}\\s*\\n([\\s\\S]*)`, 'i');
  
    const match = content.match(regex);
    return match ? match[1].trim() : '';
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
        const articleContent = await this.generateArticle(result.paper, result.evaluation);
        console.log(articleContent);
        
        // 文字列コンテンツをPaperArticle形式に変換
        const article = await this.parseArticleContent(articleContent, result.paper);
        
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
   * テキストコンテンツをHTML形式に変換
   */
  private async convertContentToHtml(content: string, sectionName: string = 'content'): Promise<string> {
    const htmlConversionPrompt = `以下の論文解説コンテンツを、適切なHTML形式に変換してください。

要求事項：
1. 段落は<p>タグで囲む
2. 見出しがあれば適切なh1-h6タグを使用
3. 数式は既存の$記法を維持
4. 既存のimg tagやdivタグは保持
5. リストがある場合は<ul><li>または<ol><li>を使用
6. 強調すべき部分は<strong>や<em>を使用
7. 読みやすいHTML構造にする
8. 不要な改行は削除し、適切な構造化を行う

変換対象のコンテンツ：
${content}

注意：
- HTMLタグのみを出力し、説明文は含めないでください
- 既存のFigure埋め込み用のdivやimgタグは絶対に変更しないでください
- 数式の$記法は変更しないでください`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは技術文書をHTML形式に変換する専門家です。与えられたテキストを適切なHTML構造に変換してください。'
          },
          {
            role: 'user',
            content: htmlConversionPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 8000
      });

      const htmlContent = completion.choices[0].message.content || content;
      console.log(`Successfully converted ${sectionName} to HTML`);
      return htmlContent;
    } catch (error) {
      console.error('Error converting content to HTML:', error);
      // エラーの場合は元のコンテンツを返す
      return content;
    }
  }

  /**
   * MCP連携用のブログポスト形式に変換（将来の拡張用）
   */
  async convertToBlogPost(articleResult: ArticleGenerationResult, convertAllToHtml: boolean = false): Promise<BlogPost> {
    const { paper, article, evaluation } = articleResult;
    
    // 論文の内容をHTML形式に変換
    console.log('Converting article content to HTML...');
    const htmlContent = await this.convertContentToHtml(article.content, 'article content');
    
    // オプション: 他のセクションもHTML化
    let htmlBackground = article.background;
    let htmlGoodPoints = article.goodPoints;
    let htmlConsideration = article.consideration;
    let htmlConclusion = article.conclusion;
    
    if (convertAllToHtml) {
      console.log('Converting all sections to HTML...');
      try {
        [htmlBackground, htmlGoodPoints, htmlConsideration, htmlConclusion] = await Promise.all([
          this.convertContentToHtml(article.background, 'background'),
          this.convertContentToHtml(article.goodPoints, 'good points'),
          this.convertContentToHtml(article.consideration, 'consideration'),
          this.convertContentToHtml(article.conclusion, 'conclusion')
        ]);
      } catch (error) {
        console.warn('Error converting some sections to HTML, using original content:', error);
      }
    }
    
    const blogContent = `${article.tldr}

## 背景・目的
${htmlBackground}

## この論文の良いところ
${htmlGoodPoints}

## 論文の内容
${htmlContent}

## 考察
${htmlConsideration}

## 結論・まとめ
${htmlConclusion}

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