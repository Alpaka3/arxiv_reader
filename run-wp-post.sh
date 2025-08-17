#!/bin/bash

# WP REST API投稿スクリプト実行用シェルスクリプト

# 使用方法を表示する関数
show_usage() {
    echo "使用方法: $0 [日付]"
    echo "例:"
    echo "  $0                    # 今日の日付で実行"
    echo "  $0 2024-01-15         # 指定した日付で実行"
    echo ""
    echo "環境変数が必要です:"
    echo "  WORDPRESS_ENDPOINT    - WordPressサイトのURL"
    echo "  WORDPRESS_USERNAME    - WordPressユーザー名"
    echo "  WORDPRESS_APP_PASSWORD - WordPressアプリケーションパスワード"
}

# ヘルプオプションをチェック
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# 環境変数のチェック
if [[ -z "$WORDPRESS_ENDPOINT" ]] || [[ -z "$WORDPRESS_USERNAME" ]] || [[ -z "$WORDPRESS_APP_PASSWORD" ]]; then
    echo "❌ エラー: 必要な環境変数が設定されていません"
    echo ""
    show_usage
    exit 1
fi

# .envファイルが存在するかチェック
if [[ -f ".env" ]]; then
    echo "📄 .envファイルを読み込みます"
    source .env
else
    echo "⚠️  .envファイルが見つかりません。環境変数が設定されていることを確認してください。"
fi

# TypeScriptファイルを実行
echo "🚀 WordPress投稿スクリプトを実行します..."
echo "📅 対象日: ${1:-$(date +%Y-%m-%d)}"
echo ""

# ts-nodeがインストールされているかチェック
if ! command -v npx &> /dev/null; then
    echo "❌ エラー: npxが見つかりません。Node.jsがインストールされていることを確認してください。"
    exit 1
fi

# TypeScriptファイルを実行
npx ts-node wp-post-script.ts "$1"

echo ""
echo "✅ スクリプトの実行が完了しました"