import { NextRequest, NextResponse } from 'next/server';
import { WordPressIntegration } from '@/lib/wordpressIntegration';
import { ArticleGenerationResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articles, config, options } = body;

    // リクエストの検証
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: 'Articles array is required and must not be empty' },
        { status: 400 }
      );
    }

    // WordPress設定の検証
    const wpEndpoint = config?.endpoint || process.env.WORDPRESS_ENDPOINT;
    const wpUsername = config?.username || process.env.WORDPRESS_USERNAME;
    const wpAppPassword = config?.appPassword || process.env.WORDPRESS_APP_PASSWORD;

    if (!wpEndpoint || !wpUsername || !wpAppPassword) {
      return NextResponse.json(
        { 
          error: 'WordPress configuration is incomplete',
          missingFields: [
            !wpEndpoint && 'endpoint',
            !wpUsername && 'username',
            !wpAppPassword && 'appPassword'
          ].filter(Boolean)
        },
        { status: 400 }
      );
    }

    // WordPress統合インスタンスを作成
    const wordpress = new WordPressIntegration(wpEndpoint, wpUsername, wpAppPassword);

    // 設定の検証
    const validation = wordpress.validateConfiguration();
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'WordPress configuration validation failed',
          missingFields: validation.missingFields
        },
        { status: 400 }
      );
    }

    // 接続テスト（オプション）
    if (options?.testConnection) {
      const connectionTest = await wordpress.testConnection();
      if (!connectionTest.success) {
        return NextResponse.json(
          { 
            error: 'WordPress connection test failed',
            details: connectionTest.error
          },
          { status: 400 }
        );
      }
    }

    // 投稿オプション
    const publishDelay = options?.publishDelay || 5000;
    const publishStatus = options?.status || 'draft';

    // 記事を投稿
    let results;
    if (articles.length === 1) {
      // 単一記事の投稿
      const article = articles[0] as ArticleGenerationResult;
      const result = await wordpress.publishArticle(article);
      results = [{
        ...result,
        articleId: article.paper.arxivId
      }];
    } else {
      // 複数記事の一括投稿
      results = await wordpress.publishMultipleArticles(articles, publishDelay);
    }

    // 結果の集計
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      success: true,
      totalArticles: articles.length,
      successfulPosts: successful.length,
      failedPosts: failed.length,
      results: results.map(result => ({
        articleId: result.articleId,
        success: result.success,
        postId: result.postId,
        postUrl: result.postUrl,
        error: result.error,
        previewUrl: result.success && result.postId ? 
          wordpress.generatePreviewUrl(result.postId) : undefined,
        editUrl: result.success && result.postId ? 
          wordpress.generateEditUrl(result.postId) : undefined
      }))
    });

  } catch (error) {
    console.error('WordPress publish API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // WordPress設定の取得
    const wpEndpoint = process.env.WORDPRESS_ENDPOINT;
    const wpUsername = process.env.WORDPRESS_USERNAME;
    const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wpEndpoint || !wpUsername || !wpAppPassword) {
      return NextResponse.json(
        { 
          error: 'WordPress configuration is not set',
          configured: false
        },
        { status: 400 }
      );
    }

    const wordpress = new WordPressIntegration(wpEndpoint, wpUsername, wpAppPassword);

    switch (action) {
      case 'test-connection':
        const connectionTest = await wordpress.testConnection();
        return NextResponse.json({
          success: connectionTest.success,
          siteInfo: connectionTest.siteInfo,
          error: connectionTest.error
        });

      case 'validate-config':
        const validation = wordpress.validateConfiguration();
        return NextResponse.json({
          isValid: validation.isValid,
          missingFields: validation.missingFields,
          endpoint: wpEndpoint ? `${wpEndpoint.substring(0, 20)}...` : null
        });

      default:
        return NextResponse.json({
          configured: true,
          endpoint: wpEndpoint ? `${wpEndpoint.substring(0, 20)}...` : null,
          availableActions: ['test-connection', 'validate-config']
        });
    }

  } catch (error) {
    console.error('WordPress config API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}