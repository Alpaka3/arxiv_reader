# WordPress REST API投稿スクリプト

`evaluatePapersByDate`で取得した論文評価結果をWordPress REST APIを使用してブログに投稿するスクリプトです。

## 機能

- 指定した日付の論文を評価
- 評価結果（推論、計算過程、点数）をWordPress投稿用のHTMLコンテンツに変換
- WordPress REST APIを使用して下書き投稿を作成
- .envファイルから認証情報を自動読み込み

## 必要な環境変数

`.env`ファイルに以下の環境変数を設定してください：

```bash
# WordPress REST API設定
WORDPRESS_ENDPOINT=http://aipapernews.com/blog/wp-json/wp/v2
WORDPRESS_USERNAME=your-wp-username
WORDPRESS_APP_PASSWORD=your-app-password

# OpenAI API設定（論文評価に必要）
OPENAI_API_KEY=your-openai-api-key
OPENAI_API_BASE=https://api.openai.com/v1
```

## 使用方法

### 1. TypeScriptスクリプト直接実行

```bash
# 今日の日付で実行
npx ts-node wp-post-script.ts

# 特定の日付で実行
npx ts-node wp-post-script.ts 2024-01-15
```

### 2. シェルスクリプト実行（推奨）

```bash
# 今日の日付で実行
./run-wp-post.sh

# 特定の日付で実行
./run-wp-post.sh 2024-01-15

# ヘルプを表示
./run-wp-post.sh --help
```

### 3. Node.jsスクリプト実行

```bash
# 今日の日付で実行
node wp-post-script.js

# 特定の日付で実行
node wp-post-script.js 2024-01-15
```

## 出力例

スクリプトを実行すると、以下のような出力が表示されます：

```
📅 評価対象日: 2024-01-15
🔍 論文を評価中...
✅ 3件の論文を評価しました
1. Advanced Neural Networks for Computer Vision - 8点
2. Machine Learning in Natural Language Processing - 7点
3. Deep Learning Optimization Techniques - 6点
📝 WordPressに投稿中...
✅ 投稿が正常に作成されました！
📄 投稿ID: 123
🔗 投稿URL: http://aipapernews.com/blog/2024/01/15/post-123/
✏️  編集URL: http://aipapernews.com/blog/wp-admin/post.php?post=123&action=edit
```

## 投稿される内容

- **タイトル**: `論文評価結果 - YYYY-MM-DD`
- **ステータス**: `draft`（下書き）
- **コンテンツ**: 各論文の以下の情報
  - 論文タイトル
  - arXiv ID（リンク付き）
  - 著者一覧
  - カテゴリ
  - 評価スコア
  - 評価理由
  - 計算過程

## cURLコマンドとの対応

このスクリプトは、以下のcURLコマンドと同等の処理を行います：

```bash
curl -X POST "http://aipapernews.com/blog/wp-json/wp/v2/posts" \
  -u "WPユーザー名:アプリケーションパスワード" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "論文評価結果 - 2024-01-15",
    "content": "<evaluatePapersByDateの結果をHTMLに変換したもの>",
    "status": "draft"
  }'
```

## トラブルシューティング

### 認証エラー

- WordPressのユーザー名とアプリケーションパスワードが正しいか確認してください
- アプリケーションパスワードはWordPressの管理画面から生成する必要があります

### API エンドポイントエラー

- `WORDPRESS_ENDPOINT`がWordPressサイトの正しいREST APIエンドポイントか確認してください
- 通常は `https://your-site.com/wp-json/wp/v2` の形式です

### 論文評価エラー

- OpenAI API キーが正しく設定されているか確認してください
- 指定した日付に論文が存在するか確認してください

## ファイル構成

- `wp-post-script.ts` - TypeScript版メインスクリプト
- `wp-post-script.js` - JavaScript版メインスクリプト
- `run-wp-post.sh` - 実行用シェルスクリプト
- `.env.example` - 環境変数設定例
- `README_WP_POST.md` - このファイル