import { BlogPost, ArticleGenerationResult, PaperArticle } from './types';
import { WordPressIntegration } from './wordpressIntegration';

/**
 * ブログ統合クラス（WordPress REST API対応）
 * WordPress REST APIを使用してブログ投稿を管理
 * 
 * @deprecated MCPIntegrationは非推奨です。WordPressIntegrationを直接使用してください。
 */
export class MCPIntegration {
  private wordpressIntegration: WordPressIntegration;

  constructor(wpEndpoint?: string, username?: string, appPassword?: string) {
    // WordPress REST API統合を使用
    this.wordpressIntegration = new WordPressIntegration(
      wpEndpoint || process.env.WORDPRESS_ENDPOINT,
      username || process.env.WORDPRESS_USERNAME,
      appPassword || process.env.WORDPRESS_APP_PASSWORD
    );
  }

  /**
   * 論文解説記事をWordPress投稿に変換（WordPress REST API対応）
   */
  async convertToWordPressPost(articleResult: ArticleGenerationResult): Promise<any> {
    return await this.wordpressIntegration.convertToWordPressPost(articleResult);
  }

  /**
   * NotionのDatabase形式に変換
   */
  async convertToNotionPage(articleResult: ArticleGenerationResult): Promise<any> {
    const { paper, article, evaluation } = articleResult;
    
    return {
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        'Title': {
          title: [
            {
              text: {
                content: article.title
              }
            }
          ]
        },
        'arXiv ID': {
          rich_text: [
            {
              text: {
                content: paper.arxivId
              }
            }
          ]
        },
        'Authors': {
          multi_select: paper.authors.slice(0, 5).map(author => ({ name: author }))
        },
        'Categories': {
          multi_select: paper.subjects.map(subject => ({ name: subject }))
        },
        'Score': {
          number: evaluation.finalScore
        },
        'Generated At': {
          date: {
            start: article.generatedAt
          }
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'TL;DR' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: article.tldr } }]
          }
        },
        // 他のセクションも同様に追加...
      ]
    };
  }

  /**
   * WordPress REST APIを使用してブログに投稿
   */
  async publishToBlog(articleResult: ArticleGenerationResult): Promise<{ success: boolean; postId?: number; postUrl?: string; error?: string }> {
    return await this.wordpressIntegration.publishArticle(articleResult);
  }

  /**
   * 複数の記事を一括でWordPressに投稿
   */
  async publishMultipleArticles(
    articles: ArticleGenerationResult[],
    publishDelay: number = 5000 // 5秒間隔
  ): Promise<Array<{ success: boolean; postId?: number; postUrl?: string; error?: string; articleId: string }>> {
    return await this.wordpressIntegration.publishMultipleArticles(articles, publishDelay);
  }

  /**
   * WordPress投稿のプレビューURLを生成
   */
  generatePreviewUrl(postId: number): string {
    return this.wordpressIntegration.generatePreviewUrl(postId);
  }

  /**
   * WordPress投稿の編集URLを生成
   */
  generateEditUrl(postId: number): string {
    return this.wordpressIntegration.generateEditUrl(postId);
  }

  /**
   * WordPress設定の検証
   */
  validateConfiguration(): { isValid: boolean; missingFields: string[] } {
    return this.wordpressIntegration.validateConfiguration();
  }

  /**
   * WordPress REST API接続テスト
   */
  async testConnection(): Promise<{ success: boolean; error?: string; siteInfo?: any }> {
    return await this.wordpressIntegration.testConnection();
  }
}