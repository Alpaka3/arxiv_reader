// 論文情報の型定義
export interface PaperInfo {
  title: string;
  authors: string[];
  abstract: string;
  arxivId: string;
  subjects: string[];
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

// API レスポンスの型定義
export interface EvaluationResponse {
  success: boolean;
  evaluation: EvaluationResult;
  formattedOutput: {
    reasoning: string;
    calculation: string;
    point: number;
  };
  error?: string;
}

// API リクエストの型定義
export interface EvaluationRequest {
  arxivUrl: string;
}

