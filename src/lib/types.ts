// 論文情報の型定義
export interface PaperInfo {
  title: string;
  authors: string[];
  abstract: string;
  arxivId: string;
  subjects: string[];
  publishedDate?: string;
}

// 評価結果の型定義
export interface EvaluationResult {
  famousAuthorScore: number;
  firstAuthorScore: number;
  innovationScore: number;
  applicabilityScore: number;
  baseTotal: number;
  learningExperimentBonus: number;
  trendyTopicBonus: number;
  softwareEngineeringPenalty: number;
  logicPenalty: number;
  finalScore: number;
  reasoning: string;
}

// フォーマット済み出力の型定義
export interface FormattedOutput {
  reasoning: string;
  calculation: string;
  point: number;
}

// 論文評価結果の型定義
export interface PaperEvaluationResult {
  paper: PaperInfo;
  evaluation: EvaluationResult;
  formattedOutput: FormattedOutput;
}

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

// 論文解説記事生成結果の型定義
export interface ArticleGenerationResult {
  paper: PaperInfo;
  article: PaperArticle;
  evaluation: EvaluationResult;
}

// API レスポンスの型定義
export interface EvaluationResponse {
  success: boolean;
  evaluation?: EvaluationResult;
  formattedOutput?: FormattedOutput;
  error?: string;
}

// 日付指定評価のレスポンス型定義
export interface DateEvaluationResponse {
  success: boolean;
  date: string;
  totalPapers: number;
  results?: PaperEvaluationResult[];
  articles?: ArticleGenerationResult[];
  error?: string;
}

// API リクエストの型定義
export interface EvaluationRequest {
  arxivUrl: string;
}

// MCP連携用のブログポスト型定義（将来の拡張用）
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

