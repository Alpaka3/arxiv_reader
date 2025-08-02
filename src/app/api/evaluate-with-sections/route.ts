import { NextRequest, NextResponse } from 'next/server';
import { ArxivPaperEvaluator } from '@/lib/paperEvaluator';

interface DateSectionEvaluationResponse {
  success: boolean;
  date: string;
  totalPapers: number;
  results?: Array<{
    paper: any;
    evaluation: any;
    formattedOutput: any;
  }>;
  sectionResults?: Array<{
    paper: any;
    evaluation: any;
    sections: Array<{
      sectionName: string;
      content: string;
      prompt: string;
    }>;
  }>;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { date, debugMode = true } = await request.json();

    if (!date) {
      return NextResponse.json({
        success: false,
        date: '',
        totalPapers: 0,
        error: '日付が指定されていません'
      } as DateSectionEvaluationResponse);
    }

    const evaluator = new ArxivPaperEvaluator();
    const { results, sectionResults } = await evaluator.evaluatePapersWithSections(date, debugMode);

    return NextResponse.json({
      success: true,
      date,
      totalPapers: results.length,
      results,
      sectionResults
    } as DateSectionEvaluationResponse);

  } catch (error) {
    console.error('Error in evaluate-with-sections API:', error);
    return NextResponse.json({
      success: false,
      date: '',
      totalPapers: 0,
      error: `評価中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    } as DateSectionEvaluationResponse);
  }
}