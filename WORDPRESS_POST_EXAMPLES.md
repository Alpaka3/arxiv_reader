# WordPress REST API投稿方法の具体例

このドキュメントでは、`generateArticle`で生成した記事をWordPress REST APIで投稿する具体的な方法を説明します。

## 🚀 投稿方法一覧

### 1. ブラウザのUIから投稿（最も簡単）

記事生成後に表示される「WordPress投稿」ボタンを使用：

1. 論文URLを入力して記事を生成
2. 記事生成完了後、下部に表示される「📝 WordPress投稿」セクションを確認
3. 「設定を表示」をクリックして WordPress 設定を入力（または環境変数を使用）
4. 「WordPressに投稿」ボタンをクリック

![投稿ボタンの場所](記事生成結果の下部に表示されます)

### 2. JavaScript/TypeScriptから直接投稿

```typescript
// 単一記事の投稿
const publishArticle = async (articleResult: ArticleGenerationResult) => {
  const response = await fetch('/api/wordpress/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      articles: [articleResult],
      options: {
        testConnection: true,  // 投稿前に接続テスト
        status: 'draft'        // 'draft' または 'publish'
      }
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('投稿成功:', result.results[0].postUrl);
  } else {
    console.error('投稿失敗:', result.error);
  }
};
```

### 3. 複数記事の一括投稿

```typescript
// 複数記事を5秒間隔で投稿
const publishMultipleArticles = async (articles: ArticleGenerationResult[]) => {
  const response = await fetch('/api/wordpress/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      articles: articles,
      options: {
        publishDelay: 5000,  // 5秒間隔
        status: 'draft'
      }
    })
  });

  const result = await response.json();
  
  console.log(`${result.successfulPosts}/${result.totalArticles} 件の投稿が成功しました`);
  
  // 各記事の結果を確認
  result.results.forEach((articleResult: any) => {
    if (articleResult.success) {
      console.log(`✅ ${articleResult.articleId}: ${articleResult.postUrl}`);
    } else {
      console.log(`❌ ${articleResult.articleId}: ${articleResult.error}`);
    }
  });
};
```

### 4. カスタム設定での投稿

```typescript
// WordPress設定を動的に指定
const publishWithCustomConfig = async (articleResult: ArticleGenerationResult) => {
  const response = await fetch('/api/wordpress/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      articles: [articleResult],
      config: {
        endpoint: 'https://your-wordpress-site.com',
        username: 'your-username',
        appPassword: 'your-app-password'
      },
      options: {
        testConnection: true,
        status: 'publish'  // 直接公開
      }
    })
  });

  return await response.json();
};
```

## 🔧 セットアップ手順

### 1. WordPress側の準備

#### アプリケーションパスワードの作成
1. WordPress管理画面 → **ユーザー** → **プロフィール**
2. **アプリケーションパスワード**セクションで新しいパスワードを作成
3. 生成されたパスワードをコピー

#### REST API確認
以下のURLにアクセスして、REST APIが有効か確認：
```
https://your-wordpress-site.com/wp-json/wp/v2/
```

### 2. 環境変数の設定

`.env.local`ファイルに追加：
```env
WORDPRESS_ENDPOINT=https://your-wordpress-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### 3. 接続テスト

```typescript
// 接続テスト用のAPI呼び出し
const testConnection = async () => {
  const response = await fetch('/api/wordpress/publish?action=test-connection');
  const result = await response.json();
  
  if (result.success) {
    console.log('接続成功:', result.siteInfo);
  } else {
    console.error('接続失敗:', result.error);
  }
};
```

## 📝 投稿される内容の例

### 生成されるWordPress投稿

```html
<div class="paper-article">
  <!-- TL;DR セクション -->
  <div class="wp-block-group tldr-section" style="background-color: #f0f9ff; padding: 20px; border-radius: 8px;">
    <h2>🚀 TL;DR</h2>
    <p>この論文では、新しいTransformerアーキテクチャを提案し...</p>
  </div>

  <!-- 背景・目的セクション -->
  <div class="wp-block-group background-section">
    <h2>🎯 背景・目的</h2>
    <div class="wp-block-group__inner-container">
      <p>近年の自然言語処理において...</p>
    </div>
  </div>

  <!-- その他のセクション... -->
</div>
```

### 自動生成されるメタデータ

- **タイトル**: 記事のタイトル
- **カテゴリ**: arXivサブジェクトから自動マッピング
  - `cs.AI` → AI・機械学習
  - `cs.LG` → 機械学習
  - `cs.CV` → コンピュータビジョン
- **タグ**: 論文解説, arXiv, AI研究, 評価スコア
- **抜粋**: TL;DRの内容
- **カスタムフィールド**: arXiv ID, 評価スコア, 著者情報

## 🎨 レスポンス形式

### 成功時のレスポンス

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
      "postUrl": "https://your-site.com/2024/01/paper-title/",
      "previewUrl": "https://your-site.com/?p=123&preview=true",
      "editUrl": "https://your-site.com/wp-admin/post.php?post=123&action=edit"
    }
  ]
}
```

### エラー時のレスポンス

```json
{
  "success": false,
  "error": "WordPress configuration is incomplete",
  "missingFields": ["endpoint", "username"]
}
```

## 🚨 よくあるエラーと解決方法

### 認証エラー
```
WordPress API error: 401 - Invalid username or password
```
**解決方法**: アプリケーションパスワードが正しく設定されているか確認

### 権限エラー
```
WordPress API error: 403 - Sorry, you are not allowed to create posts
```
**解決方法**: ユーザーに投稿権限があるか確認

### 接続エラー
```
Connection test failed
```
**解決方法**: 
- WordPress URLが正しいか確認
- REST APIが有効になっているか確認
- ファイアウォールの設定を確認

## 🔄 実際の使用フロー

### 基本的な使用フロー

1. **記事生成**
   ```typescript
   // 論文URLから記事を生成
   const response = await fetch('/api/evaluate', {
     method: 'POST',
     body: JSON.stringify({ arxivUrl: 'https://arxiv.org/abs/2024.01234' })
   });
   const data = await response.json();
   ```

2. **WordPress投稿**
   ```typescript
   // 生成された記事をWordPressに投稿
   const publishResponse = await fetch('/api/wordpress/publish', {
     method: 'POST',
     body: JSON.stringify({
       articles: [data]  // 生成された記事データ
     })
   });
   ```

3. **結果確認**
   ```typescript
   const result = await publishResponse.json();
   if (result.success) {
     window.open(result.results[0].postUrl, '_blank');
   }
   ```

### バッチ処理フロー

```typescript
// 複数論文の処理例
const processPapers = async (arxivUrls: string[]) => {
  // 1. 全ての論文を評価・記事生成
  const articles = [];
  for (const url of arxivUrls) {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({ arxivUrl: url })
    });
    const article = await response.json();
    articles.push(article);
  }

  // 2. 一括でWordPressに投稿
  const publishResponse = await fetch('/api/wordpress/publish', {
    method: 'POST',
    body: JSON.stringify({
      articles: articles,
      options: {
        publishDelay: 10000,  // 10秒間隔
        status: 'draft'
      }
    })
  });

  const result = await publishResponse.json();
  console.log(`${result.successfulPosts}件の投稿が完了しました`);
};
```

## 🎯 まとめ

- **最も簡単**: ブラウザのUIから「WordPress投稿」ボタンを使用
- **プログラム制御**: `/api/wordpress/publish` エンドポイントにPOST
- **バッチ処理**: 複数記事の配列を一度に送信
- **設定方法**: 環境変数またはリクエストボディで設定
- **エラー対応**: 接続テストとエラーメッセージで問題を特定

詳細な設定方法やトラブルシューティングは `README_WORDPRESS_INTEGRATION.md` をご確認ください。