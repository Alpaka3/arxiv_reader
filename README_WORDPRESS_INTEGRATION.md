# WordPress REST API統合ガイド

このプロジェクトでは、`generateArticle`で生成したHTML記事をWordPress REST APIを使用してWordPressサイトに自動投稿できます。

## 🚀 機能概要

- **WordPress REST API統合**: MCPを使わずに直接WordPress REST APIで投稿
- **記事の自動変換**: `generateArticle`で生成した記事をWordPress用のHTML形式に変換
- **バッチ投稿**: 複数の記事を一括で投稿（レート制限対応）
- **柔軟なフォーマット**: WordPress Gutenbergブロック対応のHTML生成
- **LaTeX数式サポート**: KaTeXプラグイン用の数式フォーマット変換
- **カテゴリ・タグ自動生成**: arXivカテゴリから適切なWordPressカテゴリを自動生成

## 🔧 セットアップ

### 1. WordPress側の準備

#### アプリケーションパスワードの作成

1. WordPressの管理画面にログイン
2. **ユーザー** → **プロフィール**へ移動
3. **アプリケーションパスワード**セクションで新しいパスワードを作成
4. 生成されたパスワードをコピー（これが`WORDPRESS_APP_PASSWORD`になります）

#### REST APIの有効化確認

WordPress REST APIはデフォルトで有効ですが、以下のURLでアクセス可能か確認してください：
```
https://your-wordpress-site.com/wp-json/wp/v2/
```

### 2. 環境変数の設定

`.env.local`ファイルに以下の環境変数を追加：

```env
# WordPress REST API設定
WORDPRESS_ENDPOINT=https://your-wordpress-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=your-app-password
```

### 3. 依存関係

このプロジェクトは標準のfetch APIを使用するため、追加の依存関係は不要です。

## 📖 使用方法

### 基本的な使用例

```typescript
import { WordPressIntegration } from '@/lib/wordpressIntegration';

// WordPress統合インスタンスを作成
const wordpress = new WordPressIntegration();

// 記事を投稿
const result = await wordpress.publishArticle(articleResult);

if (result.success) {
  console.log(`投稿成功: ${result.postUrl}`);
  console.log(`編集URL: ${wordpress.generateEditUrl(result.postId!)}`);
} else {
  console.error(`投稿失敗: ${result.error}`);
}
```

### 複数記事の一括投稿

```typescript
// 複数の記事を5秒間隔で投稿
const results = await wordpress.publishMultipleArticles(
  articleResults, 
  5000 // 5秒間隔
);

results.forEach(result => {
  if (result.success) {
    console.log(`${result.articleId}: 投稿成功`);
  } else {
    console.error(`${result.articleId}: ${result.error}`);
  }
});
```

### API経由での投稿

```typescript
// 単一記事の投稿
const response = await fetch('/api/wordpress/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    articles: [articleResult],
    options: {
      testConnection: true,
      publishDelay: 5000,
      status: 'draft'
    }
  })
});

const result = await response.json();
```

### 設定の検証

```typescript
// 接続テスト
const connectionTest = await wordpress.testConnection();
if (connectionTest.success) {
  console.log('WordPress接続成功:', connectionTest.siteInfo);
} else {
  console.error('接続失敗:', connectionTest.error);
}

// 設定の検証
const validation = wordpress.validateConfiguration();
if (!validation.isValid) {
  console.error('設定不備:', validation.missingFields);
}
```

## 🎨 生成されるHTML形式

生成される記事は以下の構造でWordPressに投稿されます：

```html
<div class="paper-article">
  <!-- TL;DR セクション -->
  <div class="wp-block-group tldr-section" style="background-color: #f0f9ff; padding: 20px; border-radius: 8px;">
    <h2>🚀 TL;DR</h2>
    <p>論文の要点...</p>
  </div>
  
  <!-- 背景・目的セクション -->
  <div class="wp-block-group background-section">
    <h2>🎯 背景・目的</h2>
    <div class="wp-block-group__inner-container">
      <p>背景の説明...</p>
    </div>
  </div>
  
  <!-- その他のセクション... -->
</div>
```

### 数式の変換

LaTeX数式は自動的にKaTeXプラグイン形式に変換されます：

- インライン数式: `$E=mc^2$` → `[katex]E=mc^2[/katex]`
- ディスプレイ数式: `$$\sum_{i=1}^n x_i$$` → `[katex display]\sum_{i=1}^n x_i[/katex]`

## 🏷️ カテゴリとタグの自動生成

### カテゴリマッピング

arXivのサブジェクトは以下のようにWordPressカテゴリにマッピングされます：

- `cs.AI` → AI・機械学習
- `cs.LG` → 機械学習
- `cs.CV` → コンピュータビジョン
- `cs.CL` → 自然言語処理
- `cs.NE` → ニューラルネットワーク
- `cs.RO` → ロボティクス

### 自動生成されるタグ

- 論文解説
- arXiv
- AI研究
- 評価スコア（例：評価8点）
- サブジェクト名（cs.を除去）

## 🔧 API エンドポイント

### POST /api/wordpress/publish

記事をWordPressに投稿します。

**リクエスト例:**
```json
{
  "articles": [articleResult],
  "config": {
    "endpoint": "https://your-site.com",
    "username": "your-username",
    "appPassword": "your-app-password"
  },
  "options": {
    "testConnection": true,
    "publishDelay": 5000,
    "status": "draft"
  }
}
```

**レスポンス例:**
```json
{
  "success": true,
  "totalArticles": 1,
  "successfulPosts": 1,
  "failedPosts": 0,
  "results": [
    {
      "articleId": "2024.01234",
      "success": true,
      "postId": 123,
      "postUrl": "https://your-site.com/post-url",
      "previewUrl": "https://your-site.com/?p=123&preview=true",
      "editUrl": "https://your-site.com/wp-admin/post.php?post=123&action=edit"
    }
  ]
}
```

### GET /api/wordpress/publish

WordPress設定の確認と接続テストを行います。

**クエリパラメータ:**
- `action=test-connection`: 接続テストを実行
- `action=validate-config`: 設定の検証を実行

## 🚨 トラブルシューティング

### よくあるエラー

#### 認証エラー
```
WordPress API error: 401 - Invalid username or password
```
**解決方法**: アプリケーションパスワードが正しく設定されているか確認

#### 権限エラー
```
WordPress API error: 403 - Sorry, you are not allowed to create posts
```
**解決方法**: ユーザーに投稿権限があるか確認

#### 接続エラー
```
Connection test failed
```
**解決方法**: 
- WordPress URLが正しいか確認
- REST APIが有効になっているか確認
- ファイアウォールやセキュリティプラグインの設定を確認

### デバッグ方法

1. **接続テストの実行**:
```typescript
const connectionTest = await wordpress.testConnection();
console.log(connectionTest);
```

2. **設定の検証**:
```typescript
const validation = wordpress.validateConfiguration();
console.log(validation);
```

3. **APIレスポンスの確認**:
```bash
curl -X GET "https://your-site.com/wp-json/wp/v2/"
```

## 🔒 セキュリティ考慮事項

- アプリケーションパスワードは環境変数に保存
- HTTPS接続を推奨
- 必要最小限の権限を持つユーザーを使用
- レート制限を適切に設定

## 📝 カスタマイズ

### HTML出力のカスタマイズ

`WordPressIntegration.generateWordPressHTML()`メソッドを修正することで、出力されるHTMLをカスタマイズできます。

### カテゴリマッピングの変更

`WordPressIntegration.mapSubjectsToCategories()`メソッドを修正することで、arXivサブジェクトからWordPressカテゴリへのマッピングを変更できます。

## 🤝 サポート

問題が発生した場合は、以下を確認してください：

1. WordPress REST APIが有効になっているか
2. 認証情報が正しく設定されているか
3. ユーザーに適切な権限があるか
4. ネットワーク接続に問題がないか

追加のサポートが必要な場合は、プロジェクトのIssueを作成してください。