import { PaperInfo } from './types';
import * as cheerio from 'cheerio';

export interface ArxivHtmlContent {
  fullText: string;
  sections: {
    [sectionName: string]: string;
  };
  figures: {
    figureNumber: string;
    caption: string;
    imageUrl?: string;
  }[];
  tables: {
    tableNumber: string;
    caption: string;
    content: string;
    structuredData?: {
      headers: string[];
      rows: string[][];
      textContent: string;
    };
  }[];
  equations: {
    equation: string;
    context: string;
    isDisplayMode: boolean;
  }[];
  algorithms: {
    algorithmNumber: string;
    title: string;
    content: string;
  }[];
  abstract: string;
  methodology: string;
  experiments: string;
  results: string;
}

export class ArxivHtmlParser {
  /**
   * arXiv IDからArxivの公式HTMLページのURLを生成
   */
  private generateArxivHtmlUrl(arxivId: string): string {
    return `https://arxiv.org/html/${arxivId}v1`;
  }

  /**
   * ArxivからHTMLを取得
   */
  private async fetchArxivHtml(arxivId: string): Promise<string> {
    const arxivUrl = this.generateArxivHtmlUrl(arxivId);
    
    try {
      console.log(`Fetching Arxiv HTML for arXiv:${arxivId} from ${arxivUrl}`);
      const response = await fetch(arxivUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PaperAnalyzer/1.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Arxiv HTML: ${response.status} ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      throw new Error(`Arxiv HTML fetch failed: ${error}`);
    }
  }

  /**
   * HTMLから図表を抽出
   */
  private extractFigures($: cheerio.CheerioAPI): ArxivHtmlContent['figures'] {
    const figures: ArxivHtmlContent['figures'] = [];
    
    console.log('Starting figure extraction...');
    
    // 1. figure要素を探す（最も一般的）
    $('figure').each((_, element) => {
      const $figure = $(element);
      const $figcaption = $figure.find('figcaption');
      const $img = $figure.find('img');
      
      if ($figcaption.length > 0) {
        const captionText = $figcaption.text().trim();
        const figureMatch = captionText.match(/^(Figure\s+\d+)[:\.]?\s*(.*)/i);
        
        if (figureMatch) {
          let imageUrl = $img.attr('src');
          // 相対パスを絶対パスに変換
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://arxiv.org${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
          }
          
          figures.push({
            figureNumber: figureMatch[1],
            caption: figureMatch[2] || captionText,
            imageUrl: imageUrl || undefined
          });
          console.log(`Found figure: ${figureMatch[1]} - ${figureMatch[2]?.substring(0, 50)}...`);
        }
      }
    });
    
    // 2. div.figure, div.ltx_figure を探す（LaTeX形式）
    $('div.figure, div.ltx_figure, .ltx_figure').each((_, element) => {
      const $div = $(element);
      const text = $div.text();
      const figureMatch = text.match(/(Figure\s+\d+)[:\.]?\s*([^\n]+)/i);
      
      if (figureMatch && !figures.some(f => f.figureNumber === figureMatch[1])) {
        const $img = $div.find('img');
        let imageUrl = $img.attr('src');
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https://arxiv.org${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        
        figures.push({
          figureNumber: figureMatch[1],
          caption: figureMatch[2].trim(),
          imageUrl: imageUrl || undefined
        });
        console.log(`Found LaTeX figure: ${figureMatch[1]} - ${figureMatch[2]?.substring(0, 50)}...`);
      }
    });
    
    // 3. 図表番号を含むdiv要素を探す（より広範囲）
    $('div:contains("Figure"), p:contains("Figure")').each((_, element) => {
      const $elem = $(element);
      const text = $elem.text();
      const figureMatch = text.match(/(Figure\s+\d+)[:\.]?\s*([^\n.]{10,})/i);
      
      if (figureMatch && !figures.some(f => f.figureNumber === figureMatch[1])) {
        // 近くの画像を探す
        const $img = $elem.find('img').first() || $elem.siblings().find('img').first() || $elem.next().find('img').first();
        let imageUrl = $img.attr('src');
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https://arxiv.org${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        
        figures.push({
          figureNumber: figureMatch[1],
          caption: figureMatch[2].trim(),
          imageUrl: imageUrl || undefined
        });
        console.log(`Found additional figure: ${figureMatch[1]} - ${figureMatch[2]?.substring(0, 50)}...`);
      }
    });
    
    // 4. 画像のalt属性からも図表情報を取得
    $('img[alt*="Figure"], img[alt*="Fig"]').each((_, element) => {
      const $img = $(element);
      const altText = $img.attr('alt') || '';
      const figureMatch = altText.match(/(Figure\s+\d+|Fig\.\s*\d+)[:\.]?\s*(.*)/i);
      
      if (figureMatch && !figures.some(f => f.figureNumber.toLowerCase().includes(figureMatch[1].toLowerCase()))) {
        let imageUrl = $img.attr('src');
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https://arxiv.org${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        
        figures.push({
          figureNumber: figureMatch[1].replace(/Fig\.\s*/i, 'Figure '),
          caption: figureMatch[2] || altText,
          imageUrl: imageUrl || undefined
        });
        console.log(`Found figure from alt text: ${figureMatch[1]} - ${figureMatch[2]?.substring(0, 50)}...`);
      }
    });
    
    console.log(`Total figures extracted: ${figures.length}`);
    return figures;
  }

  /**
   * HTMLからテーブルを抽出
   */
  private extractTables($: cheerio.CheerioAPI): ArxivHtmlContent['tables'] {
    const tables: ArxivHtmlContent['tables'] = [];
    
    console.log('Starting table extraction...');
    
    // 1. table要素とそのキャプションを探す（最も一般的）
    $('table').each((_, element) => {
      const $table = $(element);
      const $caption = $table.find('caption').first();
      const $parent = $table.parent();
      
      let captionText = '';
      let tableNumber = '';
      
      // キャプションを様々な場所から探す
      if ($caption.length > 0) {
        captionText = $caption.text().trim();
      } else {
        // キャプションがtable外にある場合を探す
        const $prevCaption = $parent.prev('.ltx_caption, .caption, p:contains("Table"), div:contains("Table")');
        if ($prevCaption.length > 0) {
          captionText = $prevCaption.text().trim();
        } else {
          // 前の要素を順次確認
          let $prev = $table.prev();
          let attempts = 0;
          while ($prev.length > 0 && attempts < 3) {
            const prevText = $prev.text();
            if (prevText.match(/Table\s+\d+/i)) {
              captionText = prevText.trim();
              break;
            }
            $prev = $prev.prev();
            attempts++;
          }
        }
      }
      
      // テーブル番号を抽出
      const tableMatch = captionText.match(/(Table\s+\d+)[:\.]?\s*(.*)/i);
      if (tableMatch) {
        tableNumber = tableMatch[1];
        captionText = tableMatch[2] || captionText;
      }
      
      // テーブルの構造化データを抽出
      const tableData = this.extractTableStructure($, $table);
      
      if (tableNumber || captionText || tableData.rows.length > 0) {
        tables.push({
          tableNumber: tableNumber || `Table ${tables.length + 1}`,
          caption: captionText,
          content: tableData.textContent,
          structuredData: tableData
        });
        console.log(`Found table: ${tableNumber || `Table ${tables.length}`} - ${captionText?.substring(0, 50)}...`);
      }
    });
    
    // 2. div.table, .ltx_table を探す（LaTeX形式）
    $('div.table, .ltx_table, div:contains("Table")').each((_, element) => {
      const $div = $(element);
      const text = $div.text();
      const tableMatch = text.match(/(Table\s+\d+)[:\.]?\s*([^\n]+)/i);
      
      if (tableMatch && !tables.some(t => t.tableNumber === tableMatch[1])) {
        const $table = $div.find('table').first();
        let tableData: {
          headers: string[];
          rows: string[][];
          textContent: string;
        } = { headers: [], rows: [], textContent: text.trim() };
        
        if ($table.length > 0) {
          tableData = this.extractTableStructure($, $table);
        }
        
        tables.push({
          tableNumber: tableMatch[1],
          caption: tableMatch[2].trim(),
          content: tableData.textContent,
          structuredData: tableData
        });
        console.log(`Found LaTeX table: ${tableMatch[1]} - ${tableMatch[2]?.substring(0, 50)}...`);
      }
    });
    
    // 3. 表形式のデータを含むpre要素も探す（ASCII表など）
    $('pre').each((_, element) => {
      const $pre = $(element);
      const text = $pre.text();
      
      // ASCII表のパターンを検出
      const lines = text.split('\n').filter(line => line.trim());
      const hasTableStructure = lines.length > 2 && 
        lines.some(line => line.includes('|') || line.match(/\s{3,}/)) &&
        lines.filter(line => line.match(/[-=]{3,}/)).length > 0;
      
      if (hasTableStructure) {
        // 前後の要素からテーブル番号とキャプションを探す
        let tableNumber = '';
        let captionText = '';
        
        const $prev = $pre.prev();
        if ($prev.length > 0) {
          const prevText = $prev.text();
          const tableMatch = prevText.match(/(Table\s+\d+)[:\.]?\s*(.*)/i);
          if (tableMatch) {
            tableNumber = tableMatch[1];
            captionText = tableMatch[2];
          }
        }
        
        if (!tables.some(t => t.tableNumber === tableNumber) && tableNumber) {
          tables.push({
            tableNumber: tableNumber || `Table ${tables.length + 1}`,
            caption: captionText,
            content: text.trim(),
            structuredData: this.parseAsciiTable(text)
          });
          console.log(`Found ASCII table: ${tableNumber} - ${captionText?.substring(0, 50)}...`);
        }
      }
    });
    
    console.log(`Total tables extracted: ${tables.length}`);
    return tables;
  }

  /**
   * テーブル要素から構造化データを抽出
   */
  private extractTableStructure($: cheerio.CheerioAPI, $table: cheerio.Cheerio<any>): {
    headers: string[];
    rows: string[][];
    textContent: string;
  } {
    const headers: string[] = [];
    const rows: string[][] = [];
    
    // ヘッダーを抽出
    $table.find('thead tr, tr:first-child').first().find('th, td').each((_, cell) => {
      headers.push($(cell).text().trim());
    });
    
    // データ行を抽出
    $table.find('tbody tr, tr').each((rowIndex, row) => {
      if (rowIndex === 0 && $table.find('thead').length > 0) return; // ヘッダー行をスキップ
      
      const rowData: string[] = [];
      $(row).find('td, th').each((_, cell) => {
        rowData.push($(cell).text().trim());
      });
      
      if (rowData.length > 0) {
        rows.push(rowData);
      }
    });
    
    return {
      headers,
      rows,
      textContent: $table.text().trim()
    };
  }

  /**
   * ASCII表を解析
   */
  private parseAsciiTable(text: string): {
    headers: string[];
    rows: string[][];
    textContent: string;
  } {
    const lines = text.split('\n').filter(line => line.trim());
    const headers: string[] = [];
    const rows: string[][] = [];
    
    // 区切り線を探す
    let headerEndIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/[-=]{3,}/)) {
        headerEndIndex = i;
        break;
      }
    }
    
    if (headerEndIndex > 0) {
      // ヘッダー行を解析
      const headerLine = lines[headerEndIndex - 1];
      if (headerLine.includes('|')) {
        headers.push(...headerLine.split('|').map(h => h.trim()).filter(h => h));
      } else {
        headers.push(...headerLine.split(/\s{2,}/).map(h => h.trim()).filter(h => h));
      }
      
      // データ行を解析
      for (let i = headerEndIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/[-=]{3,}/)) continue; // 区切り線をスキップ
        
        let rowData: string[];
        if (line.includes('|')) {
          rowData = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        } else {
          rowData = line.split(/\s{2,}/).map(cell => cell.trim()).filter(cell => cell);
        }
        
        if (rowData.length > 0) {
          rows.push(rowData);
        }
      }
    }
    
    return {
      headers,
      rows,
      textContent: text
    };
  }

  /**
   * HTMLから数式を抽出
   */
  private extractEquations($: cheerio.CheerioAPI): ArxivHtmlContent['equations'] {
    const equations: ArxivHtmlContent['equations'] = [];
    
    // MathJax/KaTeX数式を探す
    $('.ltx_Math, .MathJax, .katex, math').each((_, element) => {
      const $math = $(element);
      let equation = '';
      let isDisplayMode = false;
      
      // LaTeX形式の数式を取得
      const altText = $math.attr('alttext') || $math.attr('alt');
      if (altText) {
        equation = altText;
      } else {
        equation = $math.text().trim();
      }
      
      // ディスプレイモードかどうかを判定
      isDisplayMode = $math.hasClass('ltx_Math_display') || 
                     $math.closest('.ltx_equation, .equation').length > 0;
      
      if (equation && equation.length > 2) {
        // 前後のコンテキストを取得
        const context = $math.closest('p, div, section').text().slice(0, 200);
        
        equations.push({
          equation: equation,
          context: context,
          isDisplayMode: isDisplayMode
        });
      }
    });
    
    return equations;
  }

  /**
   * HTMLからアルゴリズムを抽出
   */
  private extractAlgorithms($: cheerio.CheerioAPI): ArxivHtmlContent['algorithms'] {
    const algorithms: ArxivHtmlContent['algorithms'] = [];
    
    // アルゴリズム環境を探す
    $('.ltx_theorem_algorithm, .algorithm, div:contains("Algorithm")').each((_, element) => {
      const $algo = $(element);
      const text = $algo.text();
      const algorithmMatch = text.match(/(Algorithm\s+\d+)[:\.]?\s*([^\n]*)/i);
      
      if (algorithmMatch) {
        algorithms.push({
          algorithmNumber: algorithmMatch[1],
          title: algorithmMatch[2].trim(),
          content: text.trim()
        });
      }
    });
    
    return algorithms;
  }

  /**
   * HTMLからセクションを抽出
   */
  private extractSections($: cheerio.CheerioAPI): { [sectionName: string]: string } {
    const sections: { [sectionName: string]: string } = {};
    
    // セクション見出しを探す
    $('h1, h2, h3, h4, .ltx_title_section, .ltx_title_subsection').each((_, element) => {
      const $heading = $(element);
      const headingText = $heading.text().trim();
      
      // 一般的なセクション名をマッチング
      const sectionMatch = headingText.match(/^\d*\.?\s*(Introduction|Related Work|Background|Methodology|Method|Approach|Experiments?|Results?|Discussion|Conclusion|Future Work|Acknowledgments?)/i);
      
      if (sectionMatch) {
        const sectionName = sectionMatch[1];
        
        // セクションの内容を取得（次の見出しまで）
        let content = '';
        let $current = $heading.next();
        
        while ($current.length > 0 && !$current.is('h1, h2, h3, h4, .ltx_title_section, .ltx_title_subsection')) {
          content += $current.text() + '\n';
          $current = $current.next();
        }
        
        sections[sectionName] = content.trim();
      }
    });
    
    return sections;
  }

  /**
   * HTMLからアブストラクトを抽出
   */
  private extractAbstract($: cheerio.CheerioAPI): string {
    // アブストラクトセクションを探す
    const abstractSelectors = [
      '.ltx_abstract',
      '.abstract',
      'div:contains("Abstract")',
      'section:contains("Abstract")'
    ];
    
    for (const selector of abstractSelectors) {
      const $abstract = $(selector).first();
      if ($abstract.length > 0) {
        return $abstract.text().replace(/^Abstract\s*/i, '').trim();
      }
    }
    
    return '';
  }

  /**
   * Arxivから論文コンテンツを解析
   */
  async parsePaper(arxivId: string): Promise<ArxivHtmlContent> {
    try {
      const html = await this.fetchArxivHtml(arxivId);
      const $ = cheerio.load(html);
      
      console.log(`Parsing Arxiv HTML content for arXiv:${arxivId}`);
      
      // 全体のテキストを取得
      const fullText = $('body').text();
      
      // 各要素を抽出
      const sections = this.extractSections($);
      const figures = this.extractFigures($);
      const tables = this.extractTables($);
      const equations = this.extractEquations($);
      const algorithms = this.extractAlgorithms($);
      const abstract = this.extractAbstract($);
      
      console.log(`Extracted content: ${figures.length} figures, ${tables.length} tables, ${equations.length} equations`);
      figures.forEach((figure, index) => {
        console.log(`Figure ${index + 1}:`);
        console.log(` - Caption: ${figure.caption}`);
        console.log(` - Src: ${figure.src}`);
        console.log(` - Alt: ${figure.alt}`);
      });

      
      return {
        fullText,
        sections,
        figures,
        tables,
        equations,
        algorithms,
        abstract,
        methodology: sections['Methodology'] || sections['Method'] || sections['Approach'] || '',
        experiments: sections['Experiments'] || sections['Experimental Setup'] || '',
        results: sections['Results'] || sections['Experimental Results'] || ''
      };
      
    } catch (error) {
      console.error(`Failed to parse Arxiv HTML content for arXiv:${arxivId}:`, error);
      
      // Arxiv HTMLが利用できない場合のフォールバック
      console.log(`Arxiv HTML parsing failed, falling back to basic metadata for arXiv:${arxivId}`);
      return {
        fullText: '',
        sections: {},
        figures: [],
        tables: [],
        equations: [],
        algorithms: [],
        abstract: '',
        methodology: '',
        experiments: '',
        results: ''
      };
    }
  }

  /**
   * 論文の実際の図表リストを取得
   */
  async getRealFigureTableList(arxivId: string): Promise<{
    figureList: string;
    tableList: string;
    equationSamples: string;
    algorithmList: string;
  }> {
    const content = await this.parsePaper(arxivId);
    
    return {
      figureList: content.figures.map(f => `${f.figureNumber}: ${f.caption}`).join('\n'),
      tableList: content.tables.map(t => `${t.tableNumber}: ${t.caption}`).join('\n'),
      equationSamples: content.equations.slice(0, 5).map(e => e.equation).join('\n'),
      algorithmList: content.algorithms.map(a => `${a.algorithmNumber}: ${a.title}`).join('\n')
    };
  }

  /**
   * 論文の主要セクションの実際の内容を取得
   */
  async getRealContent(arxivId: string): Promise<{
    abstract: string;
    methodology: string;
    experiments: string;
    results: string;
    fullSections: { [key: string]: string };
  }> {
    const content = await this.parsePaper(arxivId);
    
    return {
      abstract: content.abstract,
      methodology: content.methodology,
      experiments: content.experiments,
      results: content.results,
      fullSections: content.sections
    };
  }

  /**
   * 論文のサマリー情報を取得（PDFパーサーとの互換性のため）
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
      methodology: content.methodology,
      experiments: content.experiments,
      results: content.results,
      figureList: content.figures.map(f => `${f.figureNumber}: ${f.caption}`).join('\n'),
      tableList: content.tables.map(t => `${t.tableNumber}: ${t.caption}`).join('\n'),
      equationList: content.equations.slice(0, 10).map(e => e.equation).join('\n') // 最初の10個の数式
    };
  }

  /**
   * 図表抽出の詳細情報を取得（デバッグ・テスト用）
   */
  async getDetailedExtractionInfo(arxivId: string): Promise<{
    figuresWithImages: Array<{
      figureNumber: string;
      caption: string;
      imageUrl?: string;
      hasImage: boolean;
    }>;
    structuredTables: Array<{
      tableNumber: string;
      caption: string;
      headers: string[];
      rowCount: number;
      columnCount: number;
      sampleData: string[][];
    }>;
    extractionStats: {
      totalFigures: number;
      figuresWithImages: number;
      totalTables: number;
      tablesWithStructure: number;
      totalEquations: number;
    };
  }> {
    const content = await this.parsePaper(arxivId);
    
    const figuresWithImages = content.figures.map(f => ({
      figureNumber: f.figureNumber,
      caption: f.caption,
      imageUrl: f.imageUrl,
      hasImage: !!f.imageUrl
    }));
    
    const structuredTables = content.tables.map(t => ({
      tableNumber: t.tableNumber,
      caption: t.caption,
      headers: t.structuredData?.headers || [],
      rowCount: t.structuredData?.rows.length || 0,
      columnCount: t.structuredData?.headers.length || 0,
      sampleData: t.structuredData?.rows.slice(0, 3) || [] // 最初の3行のみ
    }));
    
    const extractionStats = {
      totalFigures: content.figures.length,
      figuresWithImages: content.figures.filter(f => f.imageUrl).length,
      totalTables: content.tables.length,
      tablesWithStructure: content.tables.filter(t => t.structuredData?.rows && t.structuredData.rows.length > 0).length,
      totalEquations: content.equations.length
    };
    
    return {
      figuresWithImages,
      structuredTables,
      extractionStats
    };
  }
}