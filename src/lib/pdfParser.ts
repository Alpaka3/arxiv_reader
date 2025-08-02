import { PaperInfo } from './types';

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
   * PDFからテキストを抽出（基本的な抽出のみ）
   */
  private async extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<string> {
    console.log('Using basic PDF text extraction method');
    
    // pdf-parseライブラリに問題があるため、基本的な抽出のみを使用
    try {
      return await this.extractBasicTextFromPdf(pdfBuffer);
    } catch (error) {
      console.error('Basic PDF extraction failed:', error);
      
      // 外部サービスのフォールバック
      if (this.pdfParseEndpoint) {
        try {
          console.log('Trying external PDF parsing service...');
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
        } catch (serviceError) {
          console.warn('External PDF service also failed:', serviceError);
        }
      }
      
      // 完全なフォールバック
      console.warn('All PDF parsing methods failed, returning empty string');
      return 'PDF text extraction failed completely';
    }
  }

  /**
   * 基本的なPDFテキスト抽出のフォールバック
   */
  private async extractBasicTextFromPdf(pdfBuffer: ArrayBuffer): Promise<string> {
    try {
      // PDFの基本的な構造から可能な限りテキストを抽出
      const uint8Array = new Uint8Array(pdfBuffer);
      const pdfString = new TextDecoder('latin1').decode(uint8Array);
      
      // 複数のパターンでテキストを抽出
      const extractionPatterns = [
        /\((.*?)\)/g,           // 基本的なテキストオブジェクト
        /BT\s+(.*?)\s+ET/g,     // テキストブロック
        /Tj\s*\[(.*?)\]/g,      // テキスト配列
        />\s*([A-Za-z0-9\s.,;:!?-]+)\s*</g  // XMLライクなテキスト
      ];
      
      let extractedTexts = [];
      
      for (const pattern of extractionPatterns) {
        const matches = pdfString.match(pattern) || [];
        const texts = matches
          .map(match => {
            // パターンに応じてテキストを抽出
            if (pattern === extractionPatterns[0]) {
              return match.slice(1, -1); // ()を除去
            } else if (pattern === extractionPatterns[1]) {
              return match.replace(/BT\s+|\s+ET/g, ''); // BT/ETを除去
            } else {
              return match;
            }
          })
          .filter(text => text.length > 2 && /[a-zA-Z]/.test(text))
          .map(text => text.replace(/[^\w\s.,;:!?-]/g, ' ').trim())
          .filter(text => text.length > 3);
        
        extractedTexts.push(...texts);
      }
      
      // 重複を除去して結合
      const uniqueTexts = [...new Set(extractedTexts)];
      const finalText = uniqueTexts.join(' ').replace(/\s+/g, ' ').trim();
      
      console.log(`Basic extraction yielded ${finalText.length} characters from ${uniqueTexts.length} unique text segments`);
      
      if (finalText.length < 100) {
        console.warn('Basic extraction yielded very little text, PDF might be image-based or encrypted');
        return 'PDF appears to contain minimal extractable text. This may be an image-based PDF or contain complex formatting.';
      }
      
      return finalText;
      
    } catch (error) {
      console.error('Basic PDF extraction also failed:', error);
      return 'PDF text extraction completely failed. Using metadata only.';
    }
  }

  /**
   * テキストから図表のキャプションを抽出
   */
  private extractFigures(text: string): PdfContent['figures'] {
    const figures: PdfContent['figures'] = [];
    
    // より柔軟なFigure キャプション抽出
    const figurePatterns = [
      /Figure\s+(\d+)[:\.]?\s*([^\n\r]{10,200})/gi,
      /Fig\.\s*(\d+)[:\.]?\s*([^\n\r]{10,200})/gi,
      /図\s*(\d+)[:\.]?\s*([^\n\r]{10,200})/gi
    ];
    
    figurePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const figureNumber = `Figure ${match[1]}`;
        const caption = match[2].trim();
        
        // 重複を避ける
        if (!figures.some(f => f.figureNumber === figureNumber)) {
          figures.push({
            figureNumber,
            caption,
            pageNumber: 0
          });
        }
      }
    });
    
    return figures;
  }

  /**
   * テキストからテーブルのキャプションと内容を抽出
   */
  private extractTables(text: string): PdfContent['tables'] {
    const tables: PdfContent['tables'] = [];
    
    // より柔軟なTable キャプション抽出
    const tablePatterns = [
      /Table\s+(\d+)[:\.]?\s*([^\n\r]{10,200})/gi,
      /Tab\.\s*(\d+)[:\.]?\s*([^\n\r]{10,200})/gi,
      /表\s*(\d+)[:\.]?\s*([^\n\r]{10,200})/gi
    ];
    
    tablePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const tableNumber = `Table ${match[1]}`;
        const caption = match[2].trim();
        
        // 重複を避ける
        if (!tables.some(t => t.tableNumber === tableNumber)) {
          // テーブルの内容を抽出
          const tableContent = this.extractTableContent(text, match.index || 0, tableNumber);
          
          tables.push({
            tableNumber,
            caption,
            content: tableContent,
            pageNumber: 0
          });
        }
      }
    });
    
    return tables;
  }

  /**
   * テーブルの実際の内容を抽出
   */
  private extractTableContent(text: string, tablePosition: number, tableNumber: string): string {
    // テーブルキャプションの後から次のセクション/テーブル/図までの範囲を探索
    const searchStart = tablePosition;
    const searchEnd = Math.min(text.length, tablePosition + 2000); // 2000文字以内で探索
    const searchText = text.slice(searchStart, searchEnd);
    
    // テーブルの構造を示すパターンを探す
    const tableStructurePatterns = [
      // 区切り線で区切られたテーブル
      /[-\|+\s]{10,}\n([\s\S]*?)\n[-\|+\s]{10,}/g,
      // タブ区切りやスペース区切りの行が連続するパターン
      /(\n[^\n]*\t[^\n]*(?:\n[^\n]*\t[^\n]*){2,})/g,
      // 数値や短いテキストが規則的に並んでいるパターン
      /(\n(?:[^\n]{1,20}\s+){2,}[^\n]{1,20}(?:\n(?:[^\n]{1,20}\s+){2,}[^\n]{1,20}){2,})/g
    ];
    
    let bestMatch = '';
    let maxScore = 0;
    
    for (const pattern of tableStructurePatterns) {
      const matches = searchText.matchAll(pattern);
      for (const match of matches) {
        const content = match[1] || match[0];
        const score = this.scoreTableContent(content);
        
        if (score > maxScore) {
          maxScore = score;
          bestMatch = content.trim();
        }
      }
    }
    
    // 見つからない場合は、キャプションの後の数行を取得
    if (!bestMatch || maxScore < 3) {
      const lines = searchText.split('\n').slice(1, 10); // キャプションの次の行から9行まで
      const tableLines = lines.filter(line => 
        line.trim().length > 10 && 
        (line.includes('\t') || line.split(/\s+/).length >= 3)
      );
      
      if (tableLines.length >= 2) {
        bestMatch = tableLines.join('\n');
      }
    }
    
    return bestMatch || `[${tableNumber} content could not be extracted]`;
  }

  /**
   * テーブル内容の品質をスコアリング
   */
  private scoreTableContent(content: string): number {
    let score = 0;
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // 行数によるスコア
    score += Math.min(lines.length, 10);
    
    // 数値が含まれているかによるスコア
    const numberCount = (content.match(/\b\d+\.?\d*\b/g) || []).length;
    score += Math.min(numberCount / 5, 5);
    
    // 区切り文字によるスコア
    const separatorCount = (content.match(/[\t\|]/g) || []).length;
    score += Math.min(separatorCount / 3, 3);
    
    // 一行の長さが適切かによるスコア
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    if (avgLineLength > 20 && avgLineLength < 100) {
      score += 2;
    }
    
    return score;
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
      
      // エラーが発生してもシステムを停止せず、空の結果を返す
      return {
        fullText: '',
        sections: {},
        figures: [],
        tables: [],
        equations: [],
        algorithms: [],
        references: []
      };
    }
  }

  /**
   * テーブル内容をHTMLテーブル形式に変換
   */
  private convertTableToHtml(table: PdfContent['tables'][0]): string {
    if (!table.content || table.content.includes('[') && table.content.includes('could not be extracted')) {
      return `<div class="table-placeholder">
        <h4>${table.tableNumber}: ${table.caption}</h4>
        <p><em>Table content could not be extracted from PDF</em></p>
      </div>`;
    }

    const lines = table.content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return `<div class="table-placeholder">
        <h4>${table.tableNumber}: ${table.caption}</h4>
        <p><em>Insufficient table data extracted</em></p>
      </div>`;
    }

    // テーブルの行を解析
    const rows = lines.map(line => {
      // タブ区切り、パイプ区切り、または複数スペース区切りを検出
      let cells: string[];
      if (line.includes('\t')) {
        cells = line.split('\t');
      } else if (line.includes('|')) {
        cells = line.split('|').filter(cell => cell.trim().length > 0);
      } else {
        // 複数スペースで区切る
        cells = line.split(/\s{2,}/).filter(cell => cell.trim().length > 0);
      }
      
      return cells.map(cell => cell.trim()).filter(cell => cell.length > 0);
    });

    // 最初の行をヘッダーとして扱う
    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    let htmlTable = `<div class="extracted-table">
      <h4>${table.tableNumber}: ${table.caption}</h4>
      <table class="table-content">
        <thead>
          <tr>`;
    
    headerRow.forEach(header => {
      htmlTable += `<th>${header}</th>`;
    });
    
    htmlTable += `</tr>
        </thead>
        <tbody>`;
    
    dataRows.forEach(row => {
      htmlTable += '<tr>';
      // ヘッダーの列数に合わせて調整
      for (let i = 0; i < Math.max(headerRow.length, row.length); i++) {
        const cellContent = row[i] || '';
        htmlTable += `<td>${cellContent}</td>`;
      }
      htmlTable += '</tr>';
    });
    
    htmlTable += `</tbody>
      </table>
    </div>`;

    return htmlTable;
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
    tablesHtml: string;
  }> {
    const content = await this.parsePaper(arxivId);
    
    // テーブルをHTML形式に変換
    const tablesHtml = content.tables.map(table => this.convertTableToHtml(table)).join('\n\n');
    
    return {
      methodology: content.sections['Methodology'] || content.sections['Method'] || content.sections['Approach'] || '',
      experiments: content.sections['Experiments'] || content.sections['Experimental Setup'] || '',
      results: content.sections['Results'] || content.sections['Experimental Results'] || '',
      figureList: content.figures.map(f => `${f.figureNumber}: ${f.caption}`).join('\n'),
      tableList: content.tables.map(t => `${t.tableNumber}: ${t.caption}`).join('\n'),
      equationList: content.equations.slice(0, 10).map(e => e.equation).join('\n'), // 最初の10個の数式
      tablesHtml: tablesHtml
    };
  }
}