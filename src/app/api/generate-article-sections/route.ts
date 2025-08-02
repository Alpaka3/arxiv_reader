import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PaperInfo, EvaluationResult } from '@/lib/types';
import { ArxivPdfParser } from '@/lib/pdfParser';

interface SectionGenerationRequest {
  paperInfo: PaperInfo;
  evaluation: EvaluationResult;
  sections: string[]; // 生成したいセクション名の配列
}

interface SectionResult {
  sectionName: string;
  content: string;
  prompt: string; // 使用したプロンプト
}

interface SectionGenerationResponse {
  success: boolean;
  sections: SectionResult[];
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SectionGenerationRequest = await request.json();
    const { paperInfo, evaluation, sections } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE,
    });

    const pdfParser = new ArxivPdfParser();
    const sectionGenerator = new ArticleSectionGenerator(openai, pdfParser);

    const results: SectionResult[] = [];

    // 各セクションを個別に生成
    for (const sectionName of sections) {
      try {
        console.log(`Generating section: ${sectionName} for paper: ${paperInfo.arxivId}`);
        
        const { content, prompt } = await sectionGenerator.generateSection(
          sectionName,
          paperInfo,
          evaluation
        );
        
        results.push({
          sectionName,
          content,
          prompt
        });

        // API制限を考慮して待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error generating section ${sectionName}:`, error);
        results.push({
          sectionName,
          content: `${sectionName}セクションの生成に失敗しました: ${error}`,
          prompt: ''
        });
      }
    }

    return NextResponse.json({
      success: true,
      sections: results
    });

  } catch (error) {
    console.error('Error in generate-article-sections API:', error);
    return NextResponse.json(
      { success: false, error: `API error: ${error}` },
      { status: 500 }
    );
  }
}

class ArticleSectionGenerator {
  private openai: OpenAI;
  private pdfParser: ArxivPdfParser;

  constructor(openai: OpenAI, pdfParser: ArxivPdfParser) {
    this.openai = openai;
    this.pdfParser = pdfParser;
  }

  async generateSection(
    sectionName: string,
    paperInfo: PaperInfo,
    evaluation: EvaluationResult
  ): Promise<{ content: string; prompt: string }> {
    const prompt = this.createSectionPrompt(sectionName, paperInfo, evaluation);
    
    // 論文の内容セクションの場合は、PDFから実際の内容を取得
    let realContent = null;
    if (sectionName === '論文の内容') {
      realContent = await this.getPaperContent(paperInfo);
    }

    const finalPrompt = sectionName === '論文の内容' 
      ? this.enhanceContentPromptWithPDF(prompt, realContent, paperInfo)
      : prompt;

    const completion = await this.openai.chat.completions.create({
      model: sectionName === '論文の内容' ? 'gpt-4o-mini' : 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(sectionName)
        },
        {
          role: 'user',
          content: finalPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: sectionName === '論文の内容' ? 16000 : 4000
    });

    const content = completion.choices[0].message.content || `${sectionName}の生成に失敗しました。`;

    return { content, prompt: finalPrompt };
  }

  private async getPaperContent(paperInfo: PaperInfo) {
    const skipPdfParsing = process.env.SKIP_PDF_PARSING === 'true';
    
    if (skipPdfParsing) {
      return null;
    }

    try {
      return await this.pdfParser.getPaperSummary(paperInfo.arxivId);
    } catch (error) {
      console.warn(`Failed to fetch PDF content for ${paperInfo.arxivId}:`, error);
      return null;
    }
  }

  private getSystemPrompt(sectionName: string): string {
    const systemPrompts = {
      'TL;DR': '你是一个专业的学术论文总结专家，擅长用简洁明了的语言概括论文要点。',
      '背景・目的': '你是一个专业的学术论文分析专家，擅长解释研究背景和目的。',
      'この論文の良いところ': '你是一个专业的学术论文评价专家，擅长识别和解释论文的创新点和贡献。',
      '論文の内容': '你是一个专业的学术论文解说专家，擅长生成详细、完整的技术解说文章。你必须确保生成的内容完整且不会中途截断。',
      '考察': '你是一个专业的学术论文分析专家，擅长对研究成果进行深入的考察和分析。',
      '結論・まとめ': '你是一个专业的学术论文总结专家，擅长总结论文的重要性和实用性。'
    };

    return systemPrompts[sectionName as keyof typeof systemPrompts] || '你是一个专业的学术论文分析专家。';
  }

  private createSectionPrompt(
    sectionName: string,
    paperInfo: PaperInfo,
    evaluation: EvaluationResult
  ): string {
    const baseInfo = `論文情報:
タイトル: ${paperInfo.title}
著者: ${paperInfo.authors.join(', ')}
arXiv ID: ${paperInfo.arxivId}
カテゴリ: ${paperInfo.subjects.join(', ')}
Abstract: ${paperInfo.abstract}

評価情報:
最終スコア: ${evaluation.finalScore}点
評価理由: ${evaluation.reasoning}`;

    const sectionPrompts = {
      'TL;DR': `${baseInfo}

以下の論文について、TL;DRセクションのみを生成してください。

要求事項:
- 論文の要点を2-3行で簡潔にまとめる
- 専門用語は適度に使用し、理解しやすい表現にする
- 論文の主要な貢献や成果を含める
- セクションタイトル（## TL;DR）は含めず、内容のみを出力する

出力例:
この論文では、新しい深層学習アーキテクチャを提案し、従来手法と比較して精度を15%向上させることに成功した。提案手法は計算効率も優れており、実用的な応用が期待される。`,

      '背景・目的': `${baseInfo}

以下の論文について、「背景・目的」セクションのみを生成してください。

要求事項:
- この研究が行われた背景と目的を300字程度で説明
- 研究分野の現状と課題を含める
- なぜこの研究が必要なのかを明確にする
- セクションタイトル（## 背景・目的）は含めず、内容のみを出力する

出力例:
近年、機械学習分野では○○の問題が注目されているが、従来手法では△△という課題があった。特に、××の分野では性能向上が頭打ちになっており、新しいアプローチが求められていた。本研究は、これらの課題を解決するため、□□という新しい手法を提案し、実用的な性能向上を目指している。`,

      'この論文の良いところ': `${baseInfo}

以下の論文について、「この論文の良いところ」セクションのみを生成してください。

要求事項:
- 論文の革新性や貢献度について200字程度で説明
- 技術的な新規性を強調する
- 実用性や影響力についても言及する
- セクションタイトル（## この論文の良いところ）は含めず、内容のみを出力する

出力例:
この論文の最大の貢献は、○○という従来にない新しいアプローチを提案した点である。特に、△△の技術を××に応用することで、計算効率を大幅に改善しながら精度向上を実現している。また、提案手法は汎用性が高く、様々な分野への応用が期待できる点も評価できる。`,

      '考察': `${baseInfo}

以下の論文について、「考察」セクションのみを生成してください。

要求事項:
- 論文の意義や限界、今後の展望について300字程度で考察
- 研究の社会的・学術的意義を含める
- 限界や今後の課題についても言及する
- セクションタイトル（## 考察）は含めず、内容のみを出力する

出力例:
本研究は○○分野において重要な進歩を示しており、従来の課題を技術的に解決した意義は大きい。特に、実用的な性能向上を実現した点は産業応用への道筋を示している。一方で、△△という条件下での性能は未検証であり、今後の研究課題として残されている。また、××への拡張可能性についても検討の余地がある。`,

             '結論・まとめ': `${baseInfo}

以下の論文について、「結論・まとめ」セクションのみを生成してください。

要求事項:
- 論文の重要性と実用性について200字程度でまとめ
- 研究の成果を簡潔に要約する
- 将来への期待や影響についても言及する
- セクションタイトル（## 結論・まとめ）は含めず、内容のみを出力する

出力例:
本論文は○○分野における重要な技術的ブレークスルーを達成し、従来手法の限界を克服する新しいアプローチを提示した。提案手法の有効性は十分に実証されており、実用化への道筋も明確である。今後、この技術が広く普及することで、△△分野全体の発展に大きく貢献することが期待される。`,

       '論文の内容': `${baseInfo}

以下の論文について、「論文の内容」セクションのみをHTML記法で生成してください。

要求事項:
1. HTML記法で記述（数式は \\( \\) または \\[ \\] を使用）
2. 4000字以上の詳細な技術解説
3. 以下のHTML構造を必ず含める：
   <h2>提案手法の詳細</h2>
   <h2>技術的革新点</h2>
   <h2>実験設定と結果</h2>
   <h2>比較分析</h2>
4. 図表への言及を積極的に含める（Figure 1, Table 2など）
5. セクションタイトル（## 論文の内容）は含めず、HTML内容のみを出力する
6. 数式は適切にエスケープして \\( \\) または \\[ \\] 形式で記述する

HTML構造例:
<h2>提案手法の詳細</h2>
<p>本論文では、○○という新しい手法を提案している。この手法の核となる損失関数は以下のように定義される：</p>
<p>\\[ L = \\sum_{i=1}^{n} \\ell(f(x_i), y_i) + \\lambda R(\\theta) \\]</p>
<p>ここで、\\( f(x_i) \\)は予測値、\\( y_i \\)は正解ラベル、\\( R(\\theta) \\)は正則化項である。</p>

<h2>技術的革新点</h2>
<ul>
<li>従来手法との具体的な違い</li>
<li>新規性のある技術要素</li>
<li>計算効率や性能向上の仕組み</li>
</ul>

<h2>実験設定と結果</h2>
<p><strong>Figure 1</strong>に示すシステムアーキテクチャでは...</p>
<p><strong>Table 2</strong>の実験結果から、提案手法はベースライン手法と比較して精度が15.3%向上していることがわかる。</p>

<h2>比較分析</h2>
<p>ベースライン手法との性能比較、アブレーション研究の結果を詳述する。</p>

重要：記事を途中で終わらせず、必ず最後まで完成させてください。`
    };

    return sectionPrompts[sectionName as keyof typeof sectionPrompts] || `${baseInfo}\n\n${sectionName}セクションを生成してください。`;
  }

  private enhanceContentPromptWithPDF(
    basePrompt: string,
    realContent: any,
    paperInfo: PaperInfo
  ): string {
    if (!realContent) {
      return `${basePrompt}

以下の論文について、「論文の内容」セクションのみをHTML記法で生成してください。

要求事項:
1. HTML記法で記述（数式は \\( \\) または \\[ \\] を使用）
2. 4000字以上の詳細な技術解説
3. 以下の構造を含める：
   - <h2>提案手法の詳細</h2>
   - <h2>技術的革新点</h2>
   - <h2>実験設定と結果</h2>
   - <h2>比較分析</h2>
4. 図表への言及を積極的に含める（Figure 1, Table 2など）
5. セクションタイトル（## 論文の内容）は含めず、HTML内容のみを出力する

注意：PDFから実際の論文内容を取得できなかったため、Abstractの情報から論理的に推測される詳細な技術解説を生成してください。`;
    }

    return `${basePrompt}

【実際の論文内容】:
Methodology: ${realContent.methodology}
Experiments: ${realContent.experiments}
Results: ${realContent.results}

【実際の図表リスト】:
Figures: ${realContent.figureList || 'No figures detected'}
Tables: ${realContent.tableList || 'No tables detected'}
Equations: ${realContent.equationList || 'No equations detected'}

以下の論文について、「論文の内容」セクションのみをHTML記法で生成してください。

要求事項:
1. HTML記法で記述（数式は \\( \\) または \\[ \\] を使用）
2. 4000字以上の詳細な技術解説
3. 実際の論文内容（Methodology, Experiments, Results）を基に具体的に記述
4. 実際に検出された図表を積極的に引用
5. 以下のHTML構造を含める：
   <h2>提案手法の詳細</h2>
   <h2>技術的革新点</h2>
   <h2>実験設定と結果</h2>
   <h2>比較分析</h2>
6. セクションタイトル（## 論文の内容）は含めず、HTML内容のみを出力する

重要：記事を途中で終わらせず、必ず最後まで完成させてください。`;
  }
}