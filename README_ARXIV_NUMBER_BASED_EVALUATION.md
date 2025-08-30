# ArXiv論文番号ベース評価システム

このドキュメントでは、ArXiv論文の評価システムを日付ベースから論文番号ベースに変更した機能について説明します。

## 概要

従来のシステムでは特定の日付の論文を評価していましたが、新しいシステムでは：

- AWS Parameter Storeに最後に処理した論文番号を保存
- 論文番号（例：2508.20310の20310部分）を基準に、未処理の新しい論文のみを自動的に検出・評価
- 効率的な増分処理により、重複チェックを回避

## ArXiv論文番号の仕組み

ArXiv論文IDは `YYMM.NNNNN` の形式です：
- `YY`: 年の下2桁（例：25 = 2025年）
- `MM`: 月（例：08 = 8月）
- `NNNNN`: その月の論文の連番（20310など、順次増加）

例：`2508.20310` = 2025年8月の20310番目の論文

## 新機能

### 1. Parameter Store管理クラス

`src/lib/parameterStore.ts` - AWS Parameter Storeとの連携

```typescript
class ParameterStoreManager {
  // 最後の論文番号を取得
  async getLastArxivNumber(): Promise<string>
  
  // 最後の論文番号を保存
  async setLastArxivNumber(arxivNumber: string): Promise<void>
  
  // 論文番号の比較（新しい方が大きい）
  compareArxivNumbers(arxivId1: string, arxivId2: string): number
  
  // 指定論文番号が最後の番号より新しいかチェック
  isNewerThanLast(arxivId: string, lastArxivNumber: string): boolean
}
```

### 2. 論文番号ベース評価機能

`src/lib/paperEvaluator.ts` の新メソッド：

- `fetchPapersByNumber()`: 論文番号ベースで新しい論文を取得
- `evaluateNewPapers()`: 新しい論文の評価
- `evaluateNewPapersWithArticles()`: 新しい論文の評価＋記事生成

### 3. 新しいAPIエンドポイント

#### `/api/evaluate-by-number`
- 論文番号ベースで新しい論文を評価
- Parameter Storeから最後の論文番号を取得し、それより新しい論文のみを処理

#### `/api/evaluate-new-with-articles`
- 新しい論文の評価＋解説記事生成
- WordPress自動投稿機能付き

### 4. フロントエンドUI

新しいタブ「新着論文評価」を追加：
- Parameter Storeベースの増分処理
- 従来の日付指定機能も保持（後方互換性）

## 環境設定

### 必要な環境変数

```bash
# AWS設定（Parameter Store用）
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here

# OpenAI API設定
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1
```

### Parameter Storeの初期設定

初回実行前に、Parameter Storeに初期値を設定：

```bash
aws ssm put-parameter \
  --name "/ts-app/last_arxiv_number" \
  --type String \
  --value "2508.00001" \
  --description "最後に処理したArXiv論文番号"
```

## 使用方法

### 1. Webインターフェース

1. アプリケーションを起動：`npm run dev`
2. ブラウザで http://localhost:3000 にアクセス
3. 「新着論文評価」タブを選択
4. オプションを設定：
   - DEBUGモード：各カテゴリ3件ずつ評価
   - 解説記事生成：上位3件の詳細記事を自動生成
   - WordPress自動投稿：評価結果を自動投稿
5. 「新着論文を評価する」ボタンをクリック

### 2. API直接呼び出し

```bash
# 新着論文の評価のみ
curl -X POST http://localhost:3000/api/evaluate-by-number \
  -H "Content-Type: application/json" \
  -d '{"debugMode": true}'

# 新着論文の評価＋記事生成
curl -X POST http://localhost:3000/api/evaluate-new-with-articles \
  -H "Content-Type: application/json" \
  -d '{"debugMode": true, "postToWordPress": true}'
```

## 動作フロー

1. **Parameter Store確認**: 最後に処理した論文番号を取得
2. **ArXiv API検索**: 各カテゴリ（cs.AI, cs.CV, cs.LG）から最新論文を取得
3. **番号比較**: 論文番号が最後の番号より新しいかチェック
4. **評価実行**: 新しい論文のみをOpenAI APIで評価
5. **Parameter Store更新**: 最新の論文番号を保存
6. **記事生成**（オプション）: 上位3件の解説記事を生成
7. **WordPress投稿**（オプション）: 記事を自動投稿

## 後方互換性

従来の日付ベース評価機能は引き続き利用可能：
- `/api/evaluate-by-date`
- `/api/evaluate-with-articles`
- 「日付指定論文リスト評価」タブ

## 利点

1. **効率性**: 新しい論文のみを処理するため、処理時間とAPI使用量を削減
2. **自動化**: 手動での日付指定が不要
3. **継続性**: Parameter Storeにより処理状態を永続化
4. **スケーラビリティ**: 論文数の増加に対応
5. **重複回避**: 既に処理した論文の再評価を防止

## 注意事項

- AWS認証情報の適切な設定が必要
- Parameter Storeへの読み書き権限が必要
- 初回実行時は適切な初期値の設定が重要
- ArXiv APIのレート制限に注意（1秒間隔で制御済み）