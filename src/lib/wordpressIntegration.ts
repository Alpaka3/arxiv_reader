import { BlogPost, ArticleGenerationResult, PaperArticle } from './types';

/**
 * WordPress REST API統合クラス
 * WordPress REST APIを使用してブログ投稿を管理
 */
export class WordPressIntegration {
  private wpEndpoint: string;
  private username: string;
  private appPassword: string;

  constructor(wpEndpoint?: string, username?: string, appPassword?: string) {
    this.wpEndpoint = wpEndpoint || process.env.WORDPRESS_ENDPOINT || '';
    this.username = username || process.env.WORDPRESS_USERNAME || '';
    this.appPassword = appPassword || process.env.WORDPRESS_APP_PASSWORD || '';
  }

  /**
   * WordPress REST API認証ヘッダーを生成
   */
  private getAuthHeaders(): HeadersInit {
    const credentials = Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
      'User-Agent': 'WordPress-API-Client/1.0',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    };
  }

  /**
   * 論文解説記事をWordPress投稿形式に変換
   */
  async convertToWordPressPost(articleResult: ArticleGenerationResult): Promise<any> {
    const { paper, article, evaluation } = articleResult;
    
    // HTMLコンテンツを生成
    const content = this.generateWordPressHTML(article, paper, evaluation);
    
    // WordPress投稿データを生成（シンプルな形式）
    return {
      title: article.title,
      content,
      status: 'draft', // または 'publish'
      excerpt: article.tldr,
      // tagsとcategoriesは一旦削除してシンプルにする
      // meta情報も削除して基本的な投稿のみ行う
    };
  }

  /**
   * WordPress投稿用のHTMLコンテンツを生成
   */
  private generateWordPressHTML(article: PaperArticle, paper: any, evaluation: any): string {
    return `
<div class="paper-article">
  <!-- TL;DR セクション -->
  <div class="wp-block-group tldr-section" style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
    <h2 class="wp-block-heading">🚀 TL;DR</h2>
    <p>${article.tldr}</p>
  </div>

  <!-- 背景・目的セクション -->
  <div class="wp-block-group background-section" style="margin-bottom: 30px;">
    <h2 class="wp-block-heading">🎯 背景・目的</h2>
    <div class="wp-block-group__inner-container">
      ${this.formatContent(article.background)}
    </div>
  </div>

  <!-- この論文の良いところセクション -->
  <div class="wp-block-group good-points-section" style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
    <h2 class="wp-block-heading">✨ この論文の良いところ</h2>
    <div class="wp-block-group__inner-container">
      ${this.formatContent(article.goodPoints)}
    </div>
  </div>

  <!-- 論文の内容セクション -->
  <div class="wp-block-group content-section" style="margin-bottom: 30px;">
    <h2 class="wp-block-heading">📖 論文の内容</h2>
    <div class="wp-block-group__inner-container">
      ${this.formatContent(article.content)}
    </div>
  </div>

  <!-- 考察セクション -->
  <div class="wp-block-group consideration-section" style="margin-bottom: 30px;">
    <h2 class="wp-block-heading">🤔 考察</h2>
    <div class="wp-block-group__inner-container">
      ${this.formatContent(article.consideration)}
    </div>
  </div>

  <!-- 結論・まとめセクション -->
  <div class="wp-block-group conclusion-section" style="background-color: #fefce8; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
    <h2 class="wp-block-heading">🎉 結論・まとめ</h2>
    <div class="wp-block-group__inner-container">
      ${this.formatContent(article.conclusion)}
    </div>
  </div>

  <!-- 論文情報セクション -->
  <div class="wp-block-group paper-info-section" style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
    <h3 class="wp-block-heading">📋 論文情報</h3>
    <ul class="wp-block-list">
      <li><strong>タイトル:</strong> ${paper.title}</li>
      <li><strong>著者:</strong> ${paper.authors.join(', ')}</li>
      <li><strong>arXiv ID:</strong> <a href="https://arxiv.org/abs/${paper.arxivId}" target="_blank" rel="noopener">${paper.arxivId}</a></li>
      <li><strong>カテゴリ:</strong> ${paper.subjects.join(', ')}</li>
      <li><strong>評価スコア:</strong> <span style="background-color: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px;">${evaluation.finalScore}点</span></li>
    </ul>
  </div>
</div>`;
  }

  /**
   * コンテンツをWordPress用にフォーマット
   */
  private formatContent(content: string): string {
    if (!content) return '';
    
    // 改行を段落に変換
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map(paragraph => {
      // LaTeX数式をWordPressのKaTeXプラグイン形式に変換
      let formattedParagraph = paragraph
        .replace(/\$\$([^$]+)\$\$/g, '[katex display]$1[/katex]')
        .replace(/\$([^$]+)\$/g, '[katex]$1[/katex]');
      
      // マークダウンのヘッダーをHTMLに変換
      formattedParagraph = formattedParagraph
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>');
      
      // リストを変換
      formattedParagraph = formattedParagraph
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
      
      // 段落タグで囲む（ヘッダーやリストでない場合）
      if (!formattedParagraph.startsWith('<h') && !formattedParagraph.startsWith('<ul')) {
        formattedParagraph = `<p>${formattedParagraph}</p>`;
      }
      
      return formattedParagraph;
    }).join('\n');
  }

  /**
   * arXivのサブジェクトをWordPressカテゴリにマッピング
   */
  private mapSubjectsToCategories(subjects: string[]): string[] {
    const categoryMap: { [key: string]: string } = {
      'cs.AI': 'AI・機械学習',
      'cs.LG': '機械学習',
      'cs.CV': 'コンピュータビジョン',
      'cs.CL': '自然言語処理',
      'cs.NE': 'ニューラルネットワーク',
      'cs.RO': 'ロボティクス',
      'cs.DC': '分散システム',
      'cs.CR': 'セキュリティ',
      'cs.DB': 'データベース',
      'cs.HC': 'ヒューマンコンピュータインタラクション',
      'stat.ML': '統計的機械学習',
      'math.OC': '最適化',
      'physics.data-an': 'データ解析'
    };

    const categories = subjects
      .map(subject => categoryMap[subject] || 'その他')
      .filter((category, index, self) => self.indexOf(category) === index);

    // デフォルトカテゴリを追加
    if (!categories.includes('論文解説')) {
      categories.unshift('論文解説');
    }

    return categories;
  }

  /**
   * WordPress REST APIを使用して投稿を作成
   */
  async createPost(postData: any): Promise<{ success: boolean; postId?: number; postUrl?: string; error?: string }> {
    if (!this.wpEndpoint || !this.username || !this.appPassword) {
      return {
        success: false,
        error: 'WordPress credentials not configured'
      };
    }

    // 最初に wp-json 形式を試す
    let apiUrl = this.getPostsEndpoint();
    let attempt = 1;
    const maxAttempts = 2;

    while (attempt <= maxAttempts) {
      try {
        console.log(`🔗 WordPress API URL (Attempt ${attempt}): ${apiUrl}`);
        console.log(`👤 Username: ${this.username}`);
        console.log(`🔑 App Password: ${this.appPassword ? '[SET]' : '[NOT SET]'}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(postData)
        });

        console.log(`📡 Response Status: ${response.status}`);
        console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));

        // レスポンスのContent-Typeを確認
        const contentType = response.headers.get('content-type');
        
        // 403エラーでSiteGuard Liteのブロックの場合、フォールバックを試す
        if (response.status === 403 && attempt === 1) {
          console.log('⚠️ 403エラーが発生しました。?rest_route=形式でリトライします...');
          apiUrl = `${this.getPostsEndpointFallback()}`;
          attempt++;
          continue;
        }
        
        if (!response.ok) {
          // レスポンスボディを一度だけ読み込む
          let responseText: string;
          try {
            responseText = await response.text();
          } catch (error) {
            responseText = 'Unable to read response body';
          }
          
          // HTMLレスポンスの場合の処理
          if (contentType && contentType.includes('text/html')) {
            console.log(`❌ HTML Response (first 500 chars): ${responseText.substring(0, 500)}`);
            throw new Error(`WordPress API returned HTML instead of JSON. Status: ${response.status}. This usually indicates an authentication or endpoint configuration issue.`);
          }
          
          // JSONエラーレスポンスの場合
          try {
            const errorData = JSON.parse(responseText);
            console.log(`❌ JSON Error Response:`, errorData);
            throw new Error(`WordPress API error: ${response.status} - ${errorData.message || errorData.code || 'Unknown error'}`);
          } catch (parseError) {
            // JSONパースに失敗した場合
            console.log(`❌ Raw Error Response: ${responseText.substring(0, 500)}`);
            throw new Error(`WordPress API error: ${response.status} - Unable to parse error response: ${responseText.substring(0, 200)}`);
          }
        }

        // 成功レスポンスのパース
        try {
          const responseText = await response.text();
          const result = JSON.parse(responseText);
          console.log(`✅ Success Response:`, result);
          
          return {
            success: true,
            postId: result.id,
            postUrl: result.link
          };
        } catch (parseError) {
          // 成功レスポンスのJSONパースに失敗した場合
          const responseText = await response.text();
          console.log(`❌ Success Response Parse Error: ${responseText.substring(0, 500)}`);
          throw new Error(`Failed to parse WordPress API response as JSON: ${responseText.substring(0, 200)}`);
        }

      } catch (error) {
        console.error(`❌ createPost Error (Attempt ${attempt}):`, error);
        
        // 最後の試行でない場合は次を試す
        if (attempt < maxAttempts && error instanceof Error && error.message.includes('403')) {
          console.log('⚠️ 403エラーのため、次の方法を試します...');
          apiUrl = `${this.getPostsEndpointFallback()}`;
          attempt++;
          continue;
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }

    return {
      success: false,
      error: 'All attempts failed'
    };
  }

  /**
   * 投稿を更新
   */
  async updatePost(postId: number, postData: any): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    if (!this.wpEndpoint || !this.username || !this.appPassword) {
      return {
        success: false,
        error: 'WordPress credentials not configured'
      };
    }

    // 最初に wp-json 形式を試す
    let apiUrl = this.getPostEndpoint(postId);
    let attempt = 1;
    const maxAttempts = 2;

    while (attempt <= maxAttempts) {
      try {
        console.log(`🔗 WordPress Update API URL (Attempt ${attempt}): ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(postData)
        });

        console.log(`📡 Update Response Status: ${response.status}`);

        // レスポンスのContent-Typeを確認
        const contentType = response.headers.get('content-type');

        // 403エラーでSiteGuard Liteのブロックの場合、フォールバックを試す
        if (response.status === 403 && attempt === 1) {
          console.log('⚠️ 403エラーが発生しました。?rest_route=形式でリトライします...');
          apiUrl = this.getPostEndpointFallback(postId);
          attempt++;
          continue;
        }

        if (!response.ok) {
          // レスポンスボディを一度だけ読み込む
          let responseText: string;
          try {
            responseText = await response.text();
          } catch (error) {
            responseText = 'Unable to read response body';
          }
          
          // HTMLレスポンスの場合の処理
          if (contentType && contentType.includes('text/html')) {
            throw new Error(`WordPress API returned HTML instead of JSON. Status: ${response.status}. This usually indicates an authentication or endpoint configuration issue.`);
          }
          
          // JSONエラーレスポンスの場合
          try {
            const errorData = JSON.parse(responseText);
            throw new Error(`WordPress API error: ${response.status} - ${errorData.message || errorData.code || 'Unknown error'}`);
          } catch (parseError) {
            // JSONパースに失敗した場合
            throw new Error(`WordPress API error: ${response.status} - Unable to parse error response: ${responseText.substring(0, 200)}`);
          }
        }

        // 成功レスポンスのパース
        try {
          const responseText = await response.text();
          const result = JSON.parse(responseText);
          
          return {
            success: true,
            postUrl: result.link
          };
        } catch (parseError) {
          // 成功レスポンスのJSONパースに失敗した場合
          const responseText = await response.text();
          throw new Error(`Failed to parse WordPress API response as JSON: ${responseText.substring(0, 200)}`);
        }

      } catch (error) {
        console.error(`❌ updatePost Error (Attempt ${attempt}):`, error);
        
        // 最後の試行でない場合は次を試す
        if (attempt < maxAttempts && error instanceof Error && error.message.includes('403')) {
          console.log('⚠️ 403エラーのため、次の方法を試します...');
          apiUrl = this.getPostEndpointFallback(postId);
          attempt++;
          continue;
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }

    return {
      success: false,
      error: 'All attempts failed'
    };
  }

  /**
   * 論文記事をWordPressに投稿
   */
  async publishArticle(articleResult: ArticleGenerationResult): Promise<{ success: boolean; postId?: number; postUrl?: string; error?: string }> {
    try {
      const postData = await this.convertToWordPressPost(articleResult);
      return await this.createPostWithFallback(postData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish article'
      };
    }
  }

  /**
   * 複数の記事を一括でWordPressに投稿
   */
  async publishMultipleArticles(
    articles: ArticleGenerationResult[],
    publishDelay: number = 5000 // 5秒間隔
  ): Promise<Array<{ success: boolean; postId?: number; postUrl?: string; error?: string; articleId: string }>> {
    const results = [];

    for (const article of articles) {
      try {
        const result = await this.publishArticle(article);
        
        results.push({
          ...result,
          articleId: article.paper.arxivId
        });

        // 次の投稿まで待機（レート制限対策）
        if (publishDelay > 0 && results.length < articles.length) {
          await new Promise(resolve => setTimeout(resolve, publishDelay));
        }

      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          articleId: article.paper.arxivId
        });
      }
    }

    return results;
  }

  /**
   * WordPress投稿のプレビューURLを生成
   */
  generatePreviewUrl(postId: number): string {
    return `${this.wpEndpoint}?p=${postId}&preview=true`;
  }

  /**
   * WordPress投稿の編集URLを生成
   */
  generateEditUrl(postId: number): string {
    return `${this.wpEndpoint}/wp-admin/post.php?post=${postId}&action=edit`;
  }

  /**
   * 設定の検証
   */
  validateConfiguration(): { isValid: boolean; missingFields: string[] } {
    const missingFields = [];
    
    if (!this.wpEndpoint) missingFields.push('WORDPRESS_ENDPOINT');
    if (!this.username) missingFields.push('WORDPRESS_USERNAME');
    if (!this.appPassword) missingFields.push('WORDPRESS_APP_PASSWORD');

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * WordPress REST API接続テスト
   */
  async testConnection(): Promise<{ success: boolean; error?: string; siteInfo?: any }> {
    if (!this.wpEndpoint) {
      return {
        success: false,
        error: 'WordPress endpoint not configured'
      };
    }

    const cleanEndpoint = this.wpEndpoint.replace(/\/$/, '');
    
    // テストするURL一覧（優先順位順）
    const testUrls = [
      `${cleanEndpoint}/?rest_route=/wp/v2/`,  // 確実にアクセスできる形式
      `${cleanEndpoint}/wp-json/wp/v2/`       // 標準形式
    ];

    for (const testUrl of testUrls) {
      try {
        console.log(`🔗 Testing WordPress API connection: ${testUrl}`);
        
        const response = await fetch(testUrl);
        
        if (response.ok) {
          const siteInfo = await response.json();
          
          console.log(`✅ 接続成功: ${testUrl}`);
          return {
            success: true,
            siteInfo: {
              name: siteInfo.name,
              description: siteInfo.description,
              url: siteInfo.url,
              wpVersion: siteInfo.wp_version
            }
          };
        } else {
          console.log(`❌ 接続失敗: ${testUrl} (Status: ${response.status})`);
        }
        
      } catch (error) {
        console.log(`❌ 接続エラー: ${testUrl} - ${error}`);
      }
    }

    return {
      success: false,
      error: 'All connection attempts failed'
    };
  }

  /**
   * WordPress REST API接続テスト（詳細版）
   */
  async testConnectionDetailed(): Promise<{ success: boolean; error?: string; testResults?: any }> {
    if (!this.wpEndpoint) {
      return {
        success: false,
        error: 'WordPress endpoint not configured'
      };
    }

    const testResults: any = {};
    const cleanEndpoint = this.wpEndpoint.replace(/\/$/, '');

    // テストするエンドポイント一覧
    const testEndpoints = [
      { name: 'wp-json root', url: `${cleanEndpoint}/wp-json/` },
      { name: 'wp-json wp/v2', url: `${cleanEndpoint}/wp-json/wp/v2/` },
      { name: 'rest_route root', url: `${cleanEndpoint}/?rest_route=/` },
      { name: 'rest_route wp/v2', url: `${cleanEndpoint}/?rest_route=/wp/v2/` },
      { name: 'xmlrpc', url: `${cleanEndpoint}/xmlrpc.php` }
    ];

    console.log('🔍 WordPress REST API詳細テスト開始...');

    for (const endpoint of testEndpoints) {
      try {
        console.log(`📡 Testing ${endpoint.name}: ${endpoint.url}`);
        
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'WordPress-API-Client/1.0',
            'Accept': 'application/json, text/html',
          }
        });

        const contentType = response.headers.get('content-type') || 'unknown';
        let responseData = '';
        
        try {
          responseData = await response.text();
        } catch (e) {
          responseData = 'Unable to read response';
        }

        testResults[endpoint.name] = {
          status: response.status,
          contentType,
          isJson: contentType.includes('application/json'),
          responsePreview: responseData.substring(0, 200),
          success: response.ok
        };

        console.log(`   Status: ${response.status}, Content-Type: ${contentType}`);
        
      } catch (error) {
        testResults[endpoint.name] = {
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        };
        console.log(`   Error: ${error}`);
      }
    }

    // 結果の評価
    const hasWorkingEndpoint = Object.values(testResults).some((result: any) => result.success && result.isJson);
    
    return {
      success: hasWorkingEndpoint,
      testResults,
      error: hasWorkingEndpoint ? undefined : 'No working REST API endpoint found'
    };
  }

  /**
   * WordPress REST APIのベースURLを取得
   */
  private getBaseApiUrl(): string {
    // 既に ?rest_route= が含まれているかチェック
    if (this.wpEndpoint.includes('?rest_route=')) {
      return this.wpEndpoint;
    }
    
    // 既に wp-json/wp/v2 が含まれているかチェック
    if (this.wpEndpoint.includes('/wp-json/wp/v2')) {
      return this.wpEndpoint;
    }
    
    // 末尾のスラッシュを削除してからREST APIパスを追加
    const cleanEndpoint = this.wpEndpoint.replace(/\/$/, '');
    
    // まず wp-json 形式を試す（SiteGuard Liteが ?rest_route= をブロックする可能性があるため）
    return `${cleanEndpoint}/wp-json/wp/v2`;
  }

  /**
   * 投稿用のエンドポイントURLを生成
   */
  private getPostsEndpoint(): string {
    const cleanEndpoint = this.wpEndpoint.replace(/\/$/, '');
    
    // wp-json 形式を最初に試す
    return `${cleanEndpoint}/wp-json/wp/v2/posts`;
  }

  /**
   * 投稿用のフォールバックエンドポイントURLを生成（?rest_route=形式）
   */
  private getPostsEndpointFallback(): string {
    const cleanEndpoint = this.wpEndpoint.replace(/\/$/, '');
    
    // ?rest_route= 形式では /posts も含めてパラメータに指定
    return `${cleanEndpoint}/?rest_route=/wp/v2/posts`;
  }

  /**
   * 特定の投稿更新用のエンドポイントURLを生成
   */
  private getPostEndpoint(postId: number): string {
    const cleanEndpoint = this.wpEndpoint.replace(/\/$/, '');
    
    // wp-json 形式を最初に試す
    return `${cleanEndpoint}/wp-json/wp/v2/posts/${postId}`;
  }

  /**
   * 特定の投稿更新用のフォールバックエンドポイントURLを生成（?rest_route=形式）
   */
  private getPostEndpointFallback(postId: number): string {
    const cleanEndpoint = this.wpEndpoint.replace(/\/$/, '');
    
    // ?rest_route= 形式では /posts/ID も含めてパラメータに指定
    return `${cleanEndpoint}/?rest_route=/wp/v2/posts/${postId}`;
  }

  /**
   * XML-RPC APIを使用して投稿を作成（代替手段）
   */
  async createPostViaXmlRpc(postData: any): Promise<{ success: boolean; postId?: number; postUrl?: string; error?: string }> {
    if (!this.wpEndpoint || !this.username || !this.appPassword) {
      return {
        success: false,
        error: 'WordPress credentials not configured'
      };
    }

    try {
      const cleanEndpoint = this.wpEndpoint.replace(/\/$/, '');
      const xmlrpcUrl = `${cleanEndpoint}/xmlrpc.php`;
      
      console.log(`🔗 WordPress XML-RPC URL: ${xmlrpcUrl}`);
      console.log(`👤 Username: ${this.username}`);

      // XML-RPC リクエストボディを作成
      const xmlrpcBody = `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>wp.newPost</methodName>
  <params>
    <param><value><string>1</string></value></param>
    <param><value><string>${this.username}</string></value></param>
    <param><value><string>${this.appPassword}</string></value></param>
    <param>
      <value>
        <struct>
          <member>
            <name>post_title</name>
            <value><string><![CDATA[${postData.title}]]></string></value>
          </member>
          <member>
            <name>post_content</name>
            <value><string><![CDATA[${postData.content}]]></string></value>
          </member>
          <member>
            <name>post_status</name>
            <value><string>${postData.status || 'draft'}</string></value>
          </member>
          <member>
            <name>post_excerpt</name>
            <value><string><![CDATA[${postData.excerpt || ''}]]></string></value>
          </member>
        </struct>
      </value>
    </param>
  </params>
</methodCall>`;

      const response = await fetch(xmlrpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'User-Agent': 'WordPress-XML-RPC-Client/1.0'
        },
        body: xmlrpcBody
      });

      console.log(`📡 XML-RPC Response Status: ${response.status}`);

      if (!response.ok) {
        const responseText = await response.text();
        console.log(`❌ XML-RPC Error Response: ${responseText.substring(0, 500)}`);
        throw new Error(`XML-RPC API error: ${response.status}`);
      }

      const responseText = await response.text();
      console.log(`📄 XML-RPC Response: ${responseText.substring(0, 500)}`);

      // XML-RPC レスポンスから投稿IDを抽出（簡易的な実装）
      const postIdMatch = responseText.match(/<string>(\d+)<\/string>/);
      const postId = postIdMatch ? parseInt(postIdMatch[1]) : undefined;

      if (postId) {
        const postUrl = `${cleanEndpoint}/?p=${postId}`;
        return {
          success: true,
          postId,
          postUrl
        };
      } else {
        throw new Error('Failed to extract post ID from XML-RPC response');
      }

    } catch (error) {
      console.error(`❌ XML-RPC Error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 投稿作成（REST API失敗時はXML-RPCにフォールバック）
   */
  async createPostWithFallback(postData: any): Promise<{ success: boolean; postId?: number; postUrl?: string; error?: string }> {
    console.log('🚀 WordPress投稿を開始（REST API → XML-RPC フォールバック）');
    
    // まずREST APIを試す
    const restResult = await this.createPost(postData);
    
    if (restResult.success) {
      console.log('✅ REST APIでの投稿に成功しました');
      return restResult;
    }
    
    console.log('⚠️ REST APIが失敗しました。XML-RPCを試します...');
    
    // REST APIが失敗した場合、XML-RPCを試す
    const xmlrpcResult = await this.createPostViaXmlRpc(postData);
    
    if (xmlrpcResult.success) {
      console.log('✅ XML-RPCでの投稿に成功しました');
      return xmlrpcResult;
    }
    
    console.log('❌ 両方の方法が失敗しました');
    return {
      success: false,
      error: `REST API Error: ${restResult.error}; XML-RPC Error: ${xmlrpcResult.error}`
    };
  }
}