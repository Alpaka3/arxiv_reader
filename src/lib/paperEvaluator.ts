import OpenAI from 'openai';
import { PaperInfo, EvaluationResult, FormattedOutput } from './types';

export class ArxivPaperEvaluator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE,
    });
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
   * 指定日付のarXiv論文リストを取得
   */
  async fetchPapersByDate(date: string): Promise<PaperInfo[]> {
    const categories = ['cs.AI', 'cs.CV', 'cs.LG'];
    const papers: PaperInfo[] = [];
  
    for (const category of categories) {
      let start = 0;
      let keepFetching = true;
  
      let count = 0;
      while (keepFetching) {
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
            const entryXml = entryMatch[1];
  
            const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
            if (!publishedMatch) continue;
  
            const publishedDate = publishedMatch[1].split('T')[0];
  
            if (publishedDate === date) {
              console.log('new entry,', count);
              if (count >=3) break;
              count++;
              // 論文情報抽出（元コードと同じ）
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
    }
  
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
   * 指定日付の論文リストを評価
   */
  async evaluatePapersByDate(date: string): Promise<Array<{paper: PaperInfo, evaluation: EvaluationResult, formattedOutput: FormattedOutput}>> {
    const papers = await this.fetchPapersByDate(date);
    const results: Array<{paper: PaperInfo, evaluation: EvaluationResult, formattedOutput: FormattedOutput}> = [];

    for (const paper of papers) {
      try {

        const startTime = Date.now();
        const { evaluation, formattedOutput } = await this.evaluatePaperWithOpenAI(paper);
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        console.log(`Evaluation of ${paper.arxivId} took ${durationMs} ms`);

        results.push({ paper, evaluation, formattedOutput });
        
        // API制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`Failed to evaluate paper ${paper.arxivId}:`, error);
      }
    }

    return results;
  }
}

