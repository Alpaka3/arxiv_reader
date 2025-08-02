import { NextRequest, NextResponse } from 'next/server';
import { ArxivPaperEvaluator } from '@/lib/paperEvaluator';
import { DateEvaluationResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { date, debugMode = true } = await request.json();

    if (!date) {
      return NextResponse.json({
        success: false,
        date: '',
        totalPapers: 0,
        error: '日付が指定されていません'
      } as DateEvaluationResponse);
    }

    const evaluator = new ArxivPaperEvaluator();
    const { results, articles } = await evaluator.evaluatePapersWithArticles(date, debugMode);

    return NextResponse.json({
      success: true,
      date,
      totalPapers: results.length,
      results,
      articles
    } as DateEvaluationResponse);

  } catch (error) {
    console.error('Error in evaluate-with-articles API:', error);
    return NextResponse.json({
      success: false,
      date: '',
      totalPapers: 0,
      error: `評価中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    } as DateEvaluationResponse);
  }
}