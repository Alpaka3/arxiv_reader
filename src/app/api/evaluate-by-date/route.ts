import { NextRequest, NextResponse } from 'next/server';
import { ArxivPaperEvaluator } from '@/lib/paperEvaluator';
import { DateEvaluationResponse } from '@/lib/types';

export async function GET() {
  return NextResponse.json({
    message: 'Arxiv Papers Evaluation by Date API',
    usage: 'POST with { "date": "YYYY-MM-DD", "debugMode": true, "postToWordPress": false }',
    description: 'Evaluates papers from cs.AI, cs.CV, cs.LG categories for the specified date. Set postToWordPress to true to automatically post results to WordPress.'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, debugMode = true, postToWordPress = false } = body;

    if (!date) {
      return NextResponse.json({
        success: false,
        error: 'date is required (format: YYYY-MM-DD)'
      } as DateEvaluationResponse, { status: 400 });
    }

    // 日付形式の検証
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      } as DateEvaluationResponse, { status: 400 });
    }

    const evaluator = new ArxivPaperEvaluator();
    const results = await evaluator.evaluatePapersByDate(date, debugMode, postToWordPress);

    return NextResponse.json({
      success: true,
      date,
      totalPapers: results.length,
      results: results.map(result => ({
        paper: result.paper,
        evaluation: result.evaluation,
        formattedOutput: result.formattedOutput
      }))
    } as DateEvaluationResponse);

  } catch (error) {
    console.error('Error evaluating papers by date:', error);
    return NextResponse.json({
      success: false,
      date: '',
      totalPapers: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as DateEvaluationResponse, { status: 500 });
  }
}

