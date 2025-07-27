# 論文解説記事生成機能

## 概要

Arxiv論文評価システムに、上位3件の論文について詳細な解説記事を自動生成する機能を追加しました。この機能は将来的にMCP（Model Context Protocol）と連携してブログへの自動投稿を可能にする拡張性を持っています。

## 機能詳細

### 解説記事の構成

生成される解説記事は以下の構成になっています：

1. **TL;DR** - 論文の要点を2-3行で簡潔にまとめ
2. **背景・目的** - 研究の背景と目的を300字程度で説明
3. **この論文の良いところ** - 論文の革新性や貢献度を200字程度で説明
4. **論文の内容** - 論文の手法や実験結果を400字程度で詳しく説明
5. **考察** - 論文の意義や限界、今後の展望を300字程度で考察
6. **結論・まとめ** - 論文の重要性と実用性を200字程度でまとめ

### UI機能

- **解説記事生成チェックボックス**: 日付指定評価タブで解説記事の生成を有効/無効にできます
- **記事表示**: 生成された記事は評価結果の下に美しいカード形式で表示されます
- **評価詳細**: 各記事には対応する論文の評価詳細も含まれています

## 技術仕様

### 新しいファイル

1. **`src/lib/articleGenerator.ts`**
   - `PaperArticleGenerator`クラス: 論文解説記事の生成を担当
   - OpenAI APIを使用して構造化された記事を生成
   - 記事のHTML出力機能も提供

2. **`src/lib/mcpIntegration.ts`**
   - `MCPIntegration`クラス: 将来のMCP連携機能
   - WordPress、Notion、Medium等への投稿機能（実装予定）
   - ブログポスト形式への変換機能

3. **`src/app/api/evaluate-with-articles/route.ts`**
   - 論文評価と記事生成を同時に行う新しいAPIエンドポイント

### 型定義の追加

```typescript
// 論文解説記事の型定義
export interface PaperArticle {
  paperId: string;
  title: string;
  tldr: string;
  background: string;
  goodPoints: string;
  content: string;
  consideration: string;
  conclusion: string;
  generatedAt: string;
}

// MCP連携用のブログポスト型定義
export interface BlogPost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  publishedAt?: string;
  status: 'draft' | 'published';
  metadata: {
    paperInfo: PaperInfo;
    evaluationScore: number;
  };
}
```

## 使用方法

1. 日付指定評価タブを選択
2. 「📝 解説記事を生成する」チェックボックスをオンにする
3. 日付を入力して「指定日付の論文を評価する」ボタンをクリック
4. 評価完了後、上位3件の論文について詳細な解説記事が自動生成されます

## 将来の拡張計画

### MCP連携機能

1. **ブログプラットフォーム対応**
   - WordPress
   - Notion
   - Medium
   - その他のCMS

2. **自動投稿機能**
   - 生成された記事の自動投稿
   - スケジュール投稿
   - 一括投稿機能

3. **記事管理機能**
   - 投稿済み記事の追跡
   - 記事の編集・更新
   - プレビュー機能

### 環境変数設定（将来の実装用）

```env
# MCP連携設定
MCP_ENDPOINT=https://your-mcp-server.com
MCP_API_KEY=your-mcp-api-key

# WordPress連携
WORDPRESS_ENDPOINT=https://your-wordpress-site.com/wp-json/wp/v2
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=your-app-password

# Notion連携
NOTION_API_KEY=your-notion-api-key
NOTION_DATABASE_ID=your-database-id
```

## API仕様

### 新しいエンドポイント

#### POST `/api/evaluate-with-articles`

論文評価と記事生成を同時に実行します。

**リクエスト:**
```json
{
  "date": "2025-01-20",
  "debugMode": true
}
```

**レスポンス:**
```json
{
  "success": true,
  "date": "2025-01-20",
  "totalPapers": 3,
  "results": [...],
  "articles": [
    {
      "paper": {...},
      "article": {
        "paperId": "2507.14077",
        "title": "【論文解説】Paper Title",
        "tldr": "...",
        "background": "...",
        "goodPoints": "...",
        "content": "...",
        "consideration": "...",
        "conclusion": "...",
        "generatedAt": "2025-01-20T12:00:00.000Z"
      },
      "evaluation": {...}
    }
  ]
}
```

## パフォーマンス考慮事項

- 記事生成は論文評価後に順次実行されます
- API制限を考慮して記事生成間に2秒の待機時間を設けています
- 大量の論文を処理する場合は処理時間が長くなる可能性があります

## 今後の改善点

1. **記事品質の向上**
   - より詳細なプロンプトエンジニアリング
   - 専門用語の解説機能
   - 図表の自動生成

2. **UI/UX改善**
   - 記事の個別エクスポート機能
   - 記事のカスタマイズ機能
   - プレビュー機能の強化

3. **MCP連携の実装**
   - 実際のブログサービスとの連携
   - 投稿スケジューリング
   - 記事の自動更新機能