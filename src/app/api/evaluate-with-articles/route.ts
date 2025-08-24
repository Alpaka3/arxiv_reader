import { NextRequest, NextResponse } from 'next/server';
import { ArxivPaperEvaluator } from '@/lib/paperEvaluator';
import { DateEvaluationResponse } from '@/lib/types';

export async function GET() {
  return NextResponse.json({
    message: 'Arxiv Papers Evaluation with Articles API',
    usage: 'POST with { "date": "YYYY-MM-DD", "debugMode": true, "postToWordPress": false }',
    description: 'Evaluates papers and generates articles for top papers. Set postToWordPress to true to automatically post articles to WordPress.'
  });
}

export async function POST(request: NextRequest) {
  try {
    const { date, debugMode = true, postToWordPress = false } = await request.json();

    if (!date) {
      return NextResponse.json({
        success: false,
        date: '',
        totalPapers: 0,
        error: '日付が指定されていません'
      } as DateEvaluationResponse);
    }

    // 日付形式の検証
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({
        success: false,
        date: '',
        totalPapers: 0,
        error: 'Invalid date format. Use YYYY-MM-DD'
      } as DateEvaluationResponse, { status: 400 });
    }

    const evaluator = new ArxivPaperEvaluator();
    const { results, articles } = await evaluator.evaluatePapersWithArticles(date, debugMode, postToWordPress);

    return NextResponse.json({
      success: true,
      date,
      totalPapers: results.length,
      results,
      articles,
      wordPressPosted: postToWordPress
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