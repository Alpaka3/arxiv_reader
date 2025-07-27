import { PaperInfo } from './types';
import pdf from 'pdf-parse';

export interface PdfContent {
  fullText: string;
  sections: {
    [sectionName: string]: string;
  };
  figures: {
    figureNumber: string;
    caption: string;
    pageNumber: number;
  }[];
  tables: {
    tableNumber: string;
    caption: string;
    content: string;
    pageNumber: number;
  }[];
  equations: {
    equation: string;
    context: string;
    pageNumber: number;
  }[];
  algorithms: {
    algorithmNumber: string;
    title: string;
    content: string;
    pageNumber: number;
  }[];
  references: {
    title: string;
    authors: string[];
    year: string;
  }[];
}

export class ArxivPdfParser {
  private pdfParseEndpoint: string;

  constructor() {
    // PDF解析サービスのエンドポイント（例：pdf2json、PDF.js、専用API）
    this.pdfParseEndpoint = process.env.PDF_PARSE_ENDPOINT || '';
  }

  /**
   * arXiv IDからPDFのURLを生成
   */
  private generatePdfUrl(arxivId: string): string {
    return `https://arxiv.org/pdf/${arxivId}.pdf`;
  }

  /**
   * PDFをダウンロード
   */
  private async downloadPdf(arxivId: string): Promise<ArrayBuffer> {
    const pdfUrl = this.generatePdfUrl(arxivId);
    
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status}`);
      }
      
      return await response.arrayBuffer();
    } catch (error) {
      throw new Error(`PDF download failed: ${error}`);
    }
  }

  /**
   * PDFからテキストを抽出（PDF.jsまたは外部サービス使用）
   */
  private async extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<string> {
    if (this.pdfParseEndpoint) {
      // 外部PDF解析サービスを使用
      try {
        const formData = new FormData();
        formData.append('pdf', new Blob([pdfBuffer], { type: 'application/pdf' }));
        
        const response = await fetch(`${this.pdfParseEndpoint}/extract-text`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`PDF parsing service error: ${response.status}`);
        }
        
        const result = await response.json();
        return result.text || '';
      } catch (error) {
        console.warn('External PDF service failed, falling back to basic extraction:', error);
      }
    }

    // フォールバック：基本的なテキスト抽出
    // 実際の実装では pdf-parse や PDF.js を使用
    return 'PDF parsing not implemented - requires pdf-parse library or external service';
  }

  /**
   * テキストから図表のキャプションを抽出
   */
  private extractFigures(text: string): PdfContent['figures'] {
    const figures: PdfContent['figures'] = [];
    
    // Figure キャプションを抽出
    const figureRegex = /Figure\s+(\d+)[:\.]?\s*([^\n]+)/gi;
    const matches = text.matchAll(figureRegex);
    
    for (const match of matches) {
      figures.push({
        figureNumber: `Figure ${match[1]}`,
        caption: match[2].trim(),
        pageNumber: 0 // 実際の実装では位置から推定
      });
    }
    
    return figures;
  }

  /**
   * テキストからテーブルのキャプションを抽出
   */
  private extractTables(text: string): PdfContent['tables'] {
    const tables: PdfContent['tables'] = [];
    
    // Table キャプションを抽出
    const tableRegex = /Table\s+(\d+)[:\.]?\s*([^\n]+)/gi;
    const matches = text.matchAll(tableRegex);
    
    for (const match of matches) {
      tables.push({
        tableNumber: `Table ${match[1]}`,
        caption: match[2].trim(),
        content: '', // 実際のテーブル内容は別途抽出
        pageNumber: 0
      });
    }
    
    return tables;
  }

  /**
   * テキストから数式を抽出
   */
  private extractEquations(text: string): PdfContent['equations'] {
    const equations: PdfContent['equations'] = [];
    
    // LaTeX数式パターンを抽出
    const equationPatterns = [
      /\$\$([^$]+)\$\$/g, // ディスプレイ数式
      /\$([^$]+)\$/g,     // インライン数式
      /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, // equation環境
      /\\begin\{align\}([\s\S]*?)\\end\{align\}/g        // align環境
    ];
    
    equationPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        equations.push({
          equation: match[1].trim(),
          context: this.getEquationContext(text, match.index || 0),
          pageNumber: 0
        });
      }
    });
    
    return equations;
  }

  /**
   * 数式の前後のコンテキストを取得
   */
  private getEquationContext(text: string, position: number): string {
    const start = Math.max(0, position - 200);
    const end = Math.min(text.length, position + 200);
    return text.slice(start, end);
  }

  /**
   * テキストからアルゴリズムを抽出
   */
  private extractAlgorithms(text: string): PdfContent['algorithms'] {
    const algorithms: PdfContent['algorithms'] = [];
    
    // Algorithm キャプションを抽出
    const algorithmRegex = /Algorithm\s+(\d+)[:\.]?\s*([^\n]+)/gi;
    const matches = text.matchAll(algorithmRegex);
    
    for (const match of matches) {
      algorithms.push({
        algorithmNumber: `Algorithm ${match[1]}`,
        title: match[2].trim(),
        content: '', // 実際のアルゴリズム内容は別途抽出
        pageNumber: 0
      });
    }
    
    return algorithms;
  }

  /**
   * テキストをセクションに分割
   */
  private extractSections(text: string): { [sectionName: string]: string } {
    const sections: { [sectionName: string]: string } = {};
    
    // 一般的なセクション見出しパターン
    const sectionPatterns = [
      /(?:^|\n)\s*(\d+\.?\s+(?:Introduction|Related Work|Methodology|Method|Approach|Experiments?|Results?|Discussion|Conclusion|Abstract))\s*\n/gi,
      /(?:^|\n)\s*(Introduction|Related Work|Methodology|Method|Approach|Experiments?|Results?|Discussion|Conclusion|Abstract)\s*\n/gi
    ];
    
    // セクション境界を見つける
    const sectionBoundaries: { name: string; start: number }[] = [];
    
    sectionPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        sectionBoundaries.push({
          name: match[1].trim(),
          start: match.index || 0
        });
      }
    });
    
    // セクション境界でソート
    sectionBoundaries.sort((a, b) => a.start - b.start);
    
    // セクション内容を抽出
    for (let i = 0; i < sectionBoundaries.length; i++) {
      const current = sectionBoundaries[i];
      const next = sectionBoundaries[i + 1];
      const end = next ? next.start : text.length;
      
      sections[current.name] = text.slice(current.start, end).trim();
    }
    
    return sections;
  }

  /**
   * 論文PDFを解析してコンテンツを抽出
   */
  async parsePaper(arxivId: string): Promise<PdfContent> {
    try {
      console.log(`Downloading PDF for arXiv:${arxivId}`);
      const pdfBuffer = await this.downloadPdf(arxivId);
      
      console.log(`Extracting text from PDF for arXiv:${arxivId}`);
      const fullText = await this.extractTextFromPdf(pdfBuffer);
      
      console.log(`Parsing content structure for arXiv:${arxivId}`);
      const sections = this.extractSections(fullText);
      const figures = this.extractFigures(fullText);
      const tables = this.extractTables(fullText);
      const equations = this.extractEquations(fullText);
      const algorithms = this.extractAlgorithms(fullText);
      
      return {
        fullText,
        sections,
        figures,
        tables,
        equations,
        algorithms,
        references: [] // 参考文献の抽出は別途実装
      };
      
    } catch (error) {
      console.error(`Failed to parse PDF for arXiv:${arxivId}:`, error);
      throw new Error(`PDF parsing failed: ${error}`);
    }
  }

  /**
   * 論文の主要コンテンツをサマリー形式で取得
   */
  async getPaperSummary(arxivId: string): Promise<{
    methodology: string;
    experiments: string;
    results: string;
    figureList: string;
    tableList: string;
    equationList: string;
  }> {
    const content = await this.parsePaper(arxivId);
    
    return {
      methodology: content.sections['Methodology'] || content.sections['Method'] || content.sections['Approach'] || '',
      experiments: content.sections['Experiments'] || content.sections['Experimental Setup'] || '',
      results: content.sections['Results'] || content.sections['Experimental Results'] || '',
      figureList: content.figures.map(f => `${f.figureNumber}: ${f.caption}`).join('\n'),
      tableList: content.tables.map(t => `${t.tableNumber}: ${t.caption}`).join('\n'),
      equationList: content.equations.slice(0, 10).map(e => e.equation).join('\n') // 最初の10個の数式
    };
  }
}