import { NextRequest, NextResponse } from 'next/server';
import { WordPressIntegration } from '@/lib/wordpressIntegration';

export async function GET() {
  return NextResponse.json({
    message: 'WordPress REST API Test',
    usage: 'GET to test WordPress REST API connectivity',
    description: 'Tests multiple WordPress REST API endpoints to identify working configurations'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, username, appPassword } = body;

    // WordPress統合インスタンスを作成
    const wordpress = new WordPressIntegration(
      endpoint || process.env.WORDPRESS_ENDPOINT,
      username || process.env.WORDPRESS_USERNAME,
      appPassword || process.env.WORDPRESS_APP_PASSWORD
    );

    // 詳細テストを実行
    const testResult = await wordpress.testConnectionDetailed();

    return NextResponse.json({
      success: testResult.success,
      error: testResult.error,
      testResults: testResult.testResults,
      endpoint: endpoint || process.env.WORDPRESS_ENDPOINT
    });

  } catch (error) {
    console.error('Error in WordPress test API:', error);
    return NextResponse.json({
      success: false,
      error: `テスト中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}