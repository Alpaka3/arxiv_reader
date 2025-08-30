import OpenAI from 'openai';
import { PaperInfo, EvaluationResult, FormattedOutput, ArticleGenerationResult } from './types';
import { PaperArticleGenerator } from './articleGenerator';
import { WordPressIntegration } from './wordpressIntegration';
import { ParameterStoreManager } from './parameterStore';

export class ArxivPaperEvaluator {
  private openai: OpenAI;
  private articleGenerator: PaperArticleGenerator;
  private wordpressIntegration: WordPressIntegration;
  private parameterStore: ParameterStoreManager;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE,
    });
    this.articleGenerator = new PaperArticleGenerator();
    this.wordpressIntegration = new WordPressIntegration();
    this.parameterStore = new ParameterStoreManager();
  }

  /**
   * ArxivのURLから論文情報を取得
   */
  async fetchPaperInfo(arxivUrl: string): Promise<PaperInfo> {
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
      const authors: string[] = [];
      const authorMatches = xmlText.matchAll(/<name[^>]*>(.*?)<\/name>/g);
      for (const match of authorMatches) {
        const name = match[1].trim();
        if (name) authors.push(name);
      }

      // カテゴリ情報を取得
      const subjects: string[] = [];
      const categoryMatches = xmlText.matchAll(/<category[^>]*term="([^"]*)"[^>]*>/g);
      for (const match of categoryMatches) {
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
   * 論文番号ベースでarXiv論文リストを取得
   */
  async fetchPapersByNumber(isDebugMode: boolean = true): Promise<PaperInfo[]> {
    // const categories = ['cs.AI', 'cs.CV', 'cs.LG'];
    const categories = ['cs.AI'];
    const papers: PaperInfo[] = [];
    const maxPapersPerCategory = isDebugMode ? 3 : Infinity;
    
    // Parameter Storeから最後の論文番号を取得
    const lastArxivNumber = await this.parameterStore.getLastArxivNumber();
    console.log(`Starting from ArXiv number: ${lastArxivNumber}`);
    
    let latestArxivNumber = lastArxivNumber;
  
    for (const category of categories) {
      let start = 0;
      let keepFetching = true;
      let categoryCount = 0;
  
      while (keepFetching && categoryCount < maxPapersPerCategory) {
        try {
          const apiUrl = `http://export.arxiv.org/api/query?search_query=cat:${category}&start=${start}&max_results=100&sortBy=submittedDate&sortOrder=descending`;
          const response = await fetch(apiUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch papers for category ${category}`);
            break;
          }
  
          const xmlText = await response.text();
          const entryMatches = [...xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  
          if (entryMatches.length === 0) break;  // もうエントリがない＝終了
  
          let foundNewPaper = false;
  
          for (const entryMatch of entryMatches) {
            if (categoryCount >= maxPapersPerCategory) break;
            
            const entryXml = entryMatch[1];
            
            // 論文情報抽出
            const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
            const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
            const idMatch = entryXml.match(/<id[^>]*>.*?\/([0-9]{4}\.[0-9]{4,5})(?:v[0-9]+)?<\/id>/);
            const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);

            const title = titleMatch ? titleMatch[1].trim() : '';
            const abstract = summaryMatch ? summaryMatch[1].trim() : '';
            const arxivId = idMatch ? idMatch[1] : '';
            const publishedDate = publishedMatch ? publishedMatch[1].split('T')[0] : '';

            if (!arxivId) continue;

            // 論文番号が最後の番号より新しいかチェック
            if (this.parameterStore.isNewerThanLast(arxivId, lastArxivNumber)) {
              console.log(`New paper found: ${arxivId} (${category}), count: ${categoryCount}`);
              foundNewPaper = true;

              const authors: string[] = [];
              const authorMatches = entryXml.matchAll(/<name[^>]*>(.*?)<\/name>/g);
              for (const match of authorMatches) {
                const name = match[1].trim();
                if (name) authors.push(name);
              }

              const subjects: string[] = [];
              const categoryMatches = entryXml.matchAll(/<category[^>]*term="([^"]*)"[^>]*>/g);
              for (const match of categoryMatches) {
                const term = match[1];
                if (term) subjects.push(term);
              }

              if (title && abstract) {
                papers.push({
                  title,
                  authors,
                  abstract,
                  arxivId,
                  subjects,
                  publishedDate
                });
                categoryCount++;

                // 最新の論文番号を更新
                if (this.parameterStore.compareArxivNumbers(arxivId, latestArxivNumber) > 0) {
                  latestArxivNumber = arxivId;
                }
              }
            } else {
              // 古い論文に到達したら、このカテゴリの検索を終了
              console.log(`Reached old paper: ${arxivId}, stopping search for ${category}`);
              keepFetching = false;
              break;
            }
          }

          // 新しい論文が見つからなかった場合、検索を終了
          if (!foundNewPaper) {
            console.log(`No new papers found in this batch for ${category}, stopping search`);
            keepFetching = false;
          }
  
          start += 100;
          await new Promise(r => setTimeout(r, 1000));  // レート制限回避
  
        } catch (error) {
          console.warn(`Error fetching papers for category ${category}:`, error);
          break;
        }
      }
      
      console.log(`Category ${category}: found ${categoryCount} new papers`);
    }

    // 新しい論文が見つかった場合、Parameter Storeを更新
    if (latestArxivNumber !== lastArxivNumber) {
      try {
        await this.parameterStore.setLastArxivNumber(latestArxivNumber);
        console.log(`Updated last ArXiv number to: ${latestArxivNumber}`);
      } catch (error) {
        console.error('Failed to update Parameter Store:', error);
      }
    }
  
    console.log(`Total new papers found: ${papers.length}`);
    return papers;
  }

  /**
   * 指定日付のarXiv論文リストを取得（後方互換性のため保持）
   */
  async fetchPapersByDate(date: string, isDebugMode: boolean = true): Promise<PaperInfo[]> {
    // const categories = ['cs.AI', 'cs.CV', 'cs.LG'];
    const categories = ['cs.AI'];
    const papers: PaperInfo[] = [];
    const maxPapersPerCategory = isDebugMode ? 3 : Infinity;
  
    for (const category of categories) {
      let start = 0;
      let keepFetching = true;
      let categoryCount = 0;
  
      while (keepFetching && categoryCount < maxPapersPerCategory) {
        try {
          const apiUrl = `http://export.arxiv.org/api/query?search_query=cat:${category}&start=${start}&max_results=100&sortBy=submittedDate&sortOrder=descending`;
          const response = await fetch(apiUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch papers for category ${category}`);
            break;
          }
  
          const xmlText = await response.text();
          const entryMatches = [...xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  
          if (entryMatches.length === 0) break;  // もうエントリがない＝終了
  
          for (const entryMatch of entryMatches) {
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
  
              const authors: string[] = [];
              const authorMatches = entryXml.matchAll(/<name[^>]*>(.*?)<\/name>/g);
              for (const match of authorMatches) {
                const name = match[1].trim();
                if (name) authors.push(name);
              }
  
              const subjects: string[] = [];
              const categoryMatches = entryXml.matchAll(/<category[^>]*term="([^"]*)"[^>]*>/g);
              for (const match of categoryMatches) {
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
          await new Promise(r => setTimeout(r, 1000));  // レート制限回避
  
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
   */
  async evaluatePaperWithOpenAI(paperInfo: PaperInfo): Promise<{ evaluation: EvaluationResult, formattedOutput: FormattedOutput }> {
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
        // model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 10000
      });

      const content = completion.choices[0].message.content || '';

      // レスポンスをパース
      const { evaluation, formattedOutput } = this.parseOpenAIResponse(content);
      
      return { evaluation, formattedOutput };

    } catch (error) {
      throw new Error(`Failed to evaluate paper with OpenAI: ${error}`);
    }
  }

  /**
   * OpenAIのレスポンスをパースして評価結果に変換
   */
  private parseOpenAIResponse(content: string): { evaluation: EvaluationResult, formattedOutput: FormattedOutput } {
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
      for (let i = 4; i < numbers.length; i++) {
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

    const evaluation: EvaluationResult = {
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

    const formattedOutput: FormattedOutput = {
      reasoning,
      calculation,
      point: finalScore
    };

    return { evaluation, formattedOutput };
  }

  /**
   * 単一論文を評価（後方互換性のため）
   */
  async evaluatePaper(arxivUrl: string): Promise<{ evaluation: EvaluationResult, formattedOutput: FormattedOutput }> {
    const paperInfo = await this.fetchPaperInfo(arxivUrl);
    return await this.evaluatePaperWithOpenAI(paperInfo);
  }

  /**
   * 論文評価結果をWordPress投稿用のHTMLコンテンツに変換
   */
  private formatEvaluationResultsForWordPress(results: Array<{paper: PaperInfo, evaluation: EvaluationResult, formattedOutput: FormattedOutput}>): string {
    if (!results || results.length === 0) {
      return '<p>評価結果がありません。</p>';
    }

    let content = '<div class="paper-evaluation-results">\n';
    
    results.forEach((result, index) => {
      const { paper, evaluation, formattedOutput } = result;
      
      content += `
  <div class="paper-result" style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h3>${index + 1}. ${paper.title}</h3>
    
    <div class="paper-info" style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>arXiv ID:</strong> <a href="https://arxiv.org/abs/${paper.arxivId}" target="_blank">${paper.arxivId}</a></p>
      <p><strong>著者:</strong> ${paper.authors.join(', ')}</p>
      <p><strong>カテゴリ:</strong> ${paper.subjects.join(', ')}</p>
      <p><strong>評価スコア:</strong> <span style="background-color: #3b82f6; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${formattedOutput.point}点</span></p>
    </div>
    
    <div class="evaluation-details">
      <h4>📊 評価理由</h4>
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <p>${formattedOutput.reasoning.replace(/\n/g, '<br>')}</p>
      </div>
      
      <h4>🔢 計算過程</h4>
      <div style="background-color: #fefce8; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <p>${formattedOutput.calculation.replace(/\n/g, '<br>')}</p>
      </div>
    </div>
  </div>
`;
    });
    
    content += '</div>';
    return content;
  }

  /**
   * 論文番号ベースで新しい論文リストを評価
   */
  async evaluateNewPapers(isDebugMode: boolean = true): Promise<Array<{paper: PaperInfo, evaluation: EvaluationResult, formattedOutput: FormattedOutput}>> {
    const papers = await this.fetchPapersByNumber(isDebugMode);
    const results: Array<{paper: PaperInfo, evaluation: EvaluationResult, formattedOutput: FormattedOutput}> = [];

    console.log(`Starting evaluation of ${papers.length} new papers...`);

    for (const paper of papers) {
      try {
        const startTime = Date.now();
        const { evaluation, formattedOutput } = await this.evaluatePaperWithOpenAI(paper);
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        console.log(`Evaluation of ${paper.arxivId} took ${durationMs} ms, score: ${formattedOutput.point}`);

        results.push({ paper, evaluation, formattedOutput });
        
        // API制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`Failed to evaluate paper ${paper.arxivId}:`, error);
      }
    }

    // 点数順にソートして上位3件のみを返す
    const sortedResults = results.sort((a, b) => b.formattedOutput.point - a.formattedOutput.point);
    const top3Results = sortedResults.slice(0, 3);
    
    console.log(`Evaluation completed. Total evaluated: ${results.length}, returning top 3 results.`);
    console.log('Top 3 scores:', top3Results.map(r => r.formattedOutput.point));

    return top3Results;
  }

  /**
   * 指定日付の論文リストを評価（後方互換性のため保持）
   */
  async evaluatePapersByDate(date: string, isDebugMode: boolean = true): Promise<Array<{paper: PaperInfo, evaluation: EvaluationResult, formattedOutput: FormattedOutput}>> {
    const papers = await this.fetchPapersByDate(date, isDebugMode);
    const results: Array<{paper: PaperInfo, evaluation: EvaluationResult, formattedOutput: FormattedOutput}> = [];

    console.log(`Starting evaluation of ${papers.length} papers...`);

    for (const paper of papers) {
      try {
        const startTime = Date.now();
        const { evaluation, formattedOutput } = await this.evaluatePaperWithOpenAI(paper);
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        console.log(`Evaluation of ${paper.arxivId} took ${durationMs} ms, score: ${formattedOutput.point}`);

        results.push({ paper, evaluation, formattedOutput });
        
        // API制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`Failed to evaluate paper ${paper.arxivId}:`, error);
      }
    }

    // 点数順にソートして上位3件のみを返す
    const sortedResults = results.sort((a, b) => b.formattedOutput.point - a.formattedOutput.point);
    const top3Results = sortedResults.slice(0, 3);
    
    console.log(`Evaluation completed. Total evaluated: ${results.length}, returning top 3 results.`);
    console.log('Top 3 scores:', top3Results.map(r => r.formattedOutput.point));

    return top3Results;
  }

  /**
   * 新しい論文リストを評価し、上位3件の解説記事を生成
   */
  async evaluateNewPapersWithArticles(isDebugMode: boolean = true, postToWordPress: boolean = true): Promise<{
    results: Array<{paper: PaperInfo, evaluation: EvaluationResult, formattedOutput: FormattedOutput}>,
    articles: ArticleGenerationResult[]
  }> {
    // 論文評価を実行
    const results = await this.evaluateNewPapers(isDebugMode);
    
    console.log(`Starting article generation for top ${results.length} papers...`);
    
    // 上位3件の論文について記事を生成
    const articleInputs = results.map(result => ({
      paper: result.paper,
      evaluation: result.evaluation
    }));
    
    const articles = await this.articleGenerator.generateArticlesForPapers(articleInputs);
    
    console.log(`Article generation completed. Generated ${articles.length} articles.`);

    // WordPressに生成された記事を投稿する場合
    if (postToWordPress && articles.length > 0) {
      console.log('📝 WordPressに記事を投稿中...');
      
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        try {
          console.log(`📝 記事 ${i + 1}/${articles.length} を投稿中: ${article.paper.title}`);
          
          const postResult = await this.wordpressIntegration.publishArticle(article);

          if (postResult.success) {
            console.log(`✅ 記事 ${i + 1} の投稿が完了しました！`);
            console.log(`📄 投稿ID: ${postResult.postId}`);
            console.log(`🔗 投稿URL: ${postResult.postUrl}`);
          } else {
            console.error(`❌ 記事 ${i + 1} の投稿に失敗しました:`, postResult.error);
          }
          
          // 次の投稿まで少し待機（レート制限対策）
          if (i < articles.length - 1) {
            console.log('⏳ 次の投稿まで3秒待機...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
        } catch (error) {
          console.error(`❌ 記事 ${i + 1} の投稿中にエラーが発生しました:`, error);
        }
      }
      
      console.log(`✅ 全 ${articles.length} 記事の投稿処理が完了しました。`);
    }
    
    return { results, articles };
  }

  /**
   * 指定日付の論文リストを評価し、上位3件の解説記事を生成（後方互換性のため保持）
   */
  async evaluatePapersWithArticles(date: string, isDebugMode: boolean = true, postToWordPress: boolean = true): Promise<{
    results: Array<{paper: PaperInfo, evaluation: EvaluationResult, formattedOutput: FormattedOutput}>,
    articles: ArticleGenerationResult[]
  }> {
    // 論文評価を実行
    const results = await this.evaluatePapersByDate(date, isDebugMode);
    
    console.log(`Starting article generation for top ${results.length} papers...`);
    
    // 上位3件の論文について記事を生成
    const articleInputs = results.map(result => ({
      paper: result.paper,
      evaluation: result.evaluation
    }));
    
    const articles = await this.articleGenerator.generateArticlesForPapers(articleInputs);
    
    console.log(`Article generation completed. Generated ${articles.length} articles.`);

    // WordPressに生成された記事を投稿する場合
    if (postToWordPress && articles.length > 0) {
      console.log('📝 WordPressに記事を投稿中...');
      
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        try {
          console.log(`📝 記事 ${i + 1}/${articles.length} を投稿中: ${article.paper.title}`);
          
          const postResult = await this.wordpressIntegration.publishArticle(article);

          if (postResult.success) {
            console.log(`✅ 記事 ${i + 1} の投稿が完了しました！`);
            console.log(`📄 投稿ID: ${postResult.postId}`);
            console.log(`🔗 投稿URL: ${postResult.postUrl}`);
          } else {
            console.error(`❌ 記事 ${i + 1} の投稿に失敗しました:`, postResult.error);
          }
          
          // 次の投稿まで少し待機（レート制限対策）
          if (i < articles.length - 1) {
            console.log('⏳ 次の投稿まで3秒待機...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
        } catch (error) {
          console.error(`❌ 記事 ${i + 1} の投稿中にエラーが発生しました:`, error);
        }
      }
      
      console.log(`✅ 全 ${articles.length} 記事の投稿処理が完了しました。`);
    }
    
    return { results, articles };
  }
}

