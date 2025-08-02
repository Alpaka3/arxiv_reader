import { PaperInfo } from './types';
import * as cheerio from 'cheerio';

export interface Ar5ivContent {
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

export class Ar5ivParser {
  /**
   * arXiv IDからar5ivのURLを生成
   */
  private generateAr5ivUrl(arxivId: string): string {
    return `https://ar5iv.labs.arxiv.org/html/${arxivId}`;
  }

  /**
   * ar5ivからHTMLを取得
   */
  private async fetchAr5ivHtml(arxivId: string): Promise<string> {
    const ar5ivUrl = this.generateAr5ivUrl(arxivId);
    
    try {
      console.log(`Fetching ar5iv HTML for arXiv:${arxivId} from ${ar5ivUrl}`);
      const response = await fetch(ar5ivUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PaperAnalyzer/1.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ar5iv HTML: ${response.status} ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      throw new Error(`ar5iv fetch failed: ${error}`);
    }
  }

  /**
   * HTMLから図表を抽出
   */
  private extractFigures($: cheerio.CheerioAPI): Ar5ivContent['figures'] {
    const figures: Ar5ivContent['figures'] = [];
    
    // figure要素を探す
    $('figure').each((_, element) => {
      const $figure = $(element);
      const $figcaption = $figure.find('figcaption');
      const $img = $figure.find('img');
      
      if ($figcaption.length > 0) {
        const captionText = $figcaption.text().trim();
        const figureMatch = captionText.match(/^(Figure\s+\d+)[:\.]?\s*(.*)/i);
        
        if (figureMatch) {
          figures.push({
            figureNumber: figureMatch[1],
            caption: figureMatch[2] || captionText,
            imageUrl: $img.attr('src') || undefined
          });
        }
      }
    });
    
    // 古い形式のFigure参照も探す
    $('div.figure, div.ltx_figure').each((_, element) => {
      const $div = $(element);
      const text = $div.text();
      const figureMatch = text.match(/(Figure\s+\d+)[:\.]?\s*([^\n]+)/i);
      
      if (figureMatch && !figures.some(f => f.figureNumber === figureMatch[1])) {
        figures.push({
          figureNumber: figureMatch[1],
          caption: figureMatch[2].trim()
        });
      }
    });
    
    return figures;
  }

  /**
   * HTMLからテーブルを抽出
   */
  private extractTables($: cheerio.CheerioAPI): Ar5ivContent['tables'] {
    const tables: Ar5ivContent['tables'] = [];
    
    // table要素とそのキャプションを探す
    $('table').each((_, element) => {
      const $table = $(element);
      const $caption = $table.find('caption').first();
      const $parent = $table.parent();
      
      let captionText = '';
      let tableNumber = '';
      
      if ($caption.length > 0) {
        captionText = $caption.text().trim();
      } else {
        // キャプションがtable外にある場合
        const $prevCaption = $parent.prev('.ltx_caption, .caption');
        if ($prevCaption.length > 0) {
          captionText = $prevCaption.text().trim();
        }
      }
      
      const tableMatch = captionText.match(/(Table\s+\d+)[:\.]?\s*(.*)/i);
      if (tableMatch) {
        tableNumber = tableMatch[1];
        captionText = tableMatch[2] || captionText;
      }
      
      // テーブルの内容を抽出
      const tableContent = $table.text().trim();
      
      if (tableNumber || captionText) {
        tables.push({
          tableNumber: tableNumber || `Table ${tables.length + 1}`,
          caption: captionText,
          content: tableContent
        });
      }
    });
    
    return tables;
  }

  /**
   * HTMLから数式を抽出
   */
  private extractEquations($: cheerio.CheerioAPI): Ar5ivContent['equations'] {
    const equations: Ar5ivContent['equations'] = [];
    
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
  private extractAlgorithms($: cheerio.CheerioAPI): Ar5ivContent['algorithms'] {
    const algorithms: Ar5ivContent['algorithms'] = [];
    
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
   * ar5ivから論文コンテンツを解析
   */
  async parsePaper(arxivId: string): Promise<Ar5ivContent> {
    try {
      const html = await this.fetchAr5ivHtml(arxivId);
      const $ = cheerio.load(html);
      
      console.log(`Parsing ar5iv content for arXiv:${arxivId}`);
      
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
      console.error(`Failed to parse ar5iv content for arXiv:${arxivId}:`, error);
      
      // ar5ivが利用できない場合のフォールバック
      console.log(`ar5iv parsing failed, falling back to basic metadata for arXiv:${arxivId}`);
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
}