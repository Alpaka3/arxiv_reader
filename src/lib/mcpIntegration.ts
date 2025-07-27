import { BlogPost, ArticleGenerationResult, PaperArticle } from './types';

/**
 * MCP連携用のユーティリティクラス（将来の拡張用）
 * Model Context Protocol (MCP) を使用してブログサービスと連携する機能を提供
 */
export class MCPIntegration {
  private mcpEndpoint: string;
  private apiKey: string;

  constructor(mcpEndpoint?: string, apiKey?: string) {
    this.mcpEndpoint = mcpEndpoint || process.env.MCP_ENDPOINT || '';
    this.apiKey = apiKey || process.env.MCP_API_KEY || '';
  }

  /**
   * 論文解説記事をブログポストに変換
   */
  async convertToWordPressPost(articleResult: ArticleGenerationResult): Promise<BlogPost> {
    const { paper, article, evaluation } = articleResult;
    
    const content = `
<div class="paper-article">
  <div class="tldr-section">
    <h2>🚀 TL;DR</h2>
    <p>${article.tldr}</p>
  </div>

  <div class="background-section">
    <h2>🎯 背景・目的</h2>
    <p>${article.background}</p>
  </div>

  <div class="good-points-section">
    <h2>✨ この論文の良いところ</h2>
    <p>${article.goodPoints}</p>
  </div>

  <div class="content-section">
    <h2>📖 論文の内容</h2>
    <p>${article.content}</p>
  </div>

  <div class="consideration-section">
    <h2>🤔 考察</h2>
    <p>${article.consideration}</p>
  </div>

  <div class="conclusion-section">
    <h2>🎉 結論・まとめ</h2>
    <p>${article.conclusion}</p>
  </div>

  <div class="paper-info">
    <h3>📋 論文情報</h3>
    <ul>
      <li><strong>タイトル:</strong> ${paper.title}</li>
      <li><strong>著者:</strong> ${paper.authors.join(', ')}</li>
      <li><strong>arXiv ID:</strong> <a href="https://arxiv.org/abs/${paper.arxivId}" target="_blank">${paper.arxivId}</a></li>
      <li><strong>カテゴリ:</strong> ${paper.subjects.join(', ')}</li>
      <li><strong>評価スコア:</strong> ${evaluation.finalScore}点</li>
    </ul>
  </div>
</div>`;

    // WordPress用のタグを生成
    const tags = [
      '論文解説',
      'arXiv',
      'AI研究',
      ...paper.subjects.map(subject => subject.replace('cs.', '')),
      `評価${evaluation.finalScore}点`
    ];

    return {
      id: `wp-${paper.arxivId}-${Date.now()}`,
      title: article.title,
      content,
      tags,
      status: 'draft',
      metadata: {
        paperInfo: paper,
        evaluationScore: evaluation.finalScore
      }
    };
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
   * MCP経由でブログサービスに投稿（将来の実装用）
   */
  async publishToBlog(blogPost: BlogPost, platform: 'wordpress' | 'notion' | 'medium' = 'wordpress'): Promise<{ success: boolean; postId?: string; error?: string }> {
    if (!this.mcpEndpoint || !this.apiKey) {
      return {
        success: false,
        error: 'MCP endpoint or API key not configured'
      };
    }

    try {
      // 将来的にMCPクライアントを使用してブログサービスに投稿
      const response = await fetch(`${this.mcpEndpoint}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          platform,
          post: blogPost
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        postId: result.postId
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 複数の記事を一括でブログに投稿
   */
  async publishMultipleArticles(
    articles: ArticleGenerationResult[],
    platform: 'wordpress' | 'notion' | 'medium' = 'wordpress',
    publishDelay: number = 5000 // 5秒間隔
  ): Promise<Array<{ success: boolean; postId?: string; error?: string; articleId: string }>> {
    const results = [];

    for (const article of articles) {
      try {
        const blogPost = await this.convertToWordPressPost(article);
        const result = await this.publishToBlog(blogPost, platform);
        
        results.push({
          ...result,
          articleId: article.paper.arxivId
        });

        // 次の投稿まで待機（レート制限対策）
        if (publishDelay > 0) {
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
   * 記事のプレビューURLを生成
   */
  generatePreviewUrl(blogPost: BlogPost): string {
    return `${this.mcpEndpoint}/preview/${blogPost.id}`;
  }

  /**
   * 記事の編集URLを生成
   */
  generateEditUrl(postId: string, platform: string): string {
    switch (platform) {
      case 'wordpress':
        return `${this.mcpEndpoint}/wordpress/edit/${postId}`;
      case 'notion':
        return `${this.mcpEndpoint}/notion/edit/${postId}`;
      case 'medium':
        return `${this.mcpEndpoint}/medium/edit/${postId}`;
      default:
        return `${this.mcpEndpoint}/edit/${postId}`;
    }
  }
}