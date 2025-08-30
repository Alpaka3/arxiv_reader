import { NextRequest, NextResponse } from 'next/server';
import { ArxivPaperEvaluator } from '@/lib/paperEvaluator';
import { DateEvaluationResponse } from '@/lib/types';

export async function GET() {
  return NextResponse.json({
    message: 'Arxiv Papers Evaluation with Articles by Number API',
    usage: 'POST with { "debugMode": true, "postToWordPress": true }',
    description: 'Evaluates new papers based on ArXiv number progression, generates articles for top papers, and optionally posts to WordPress.'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { debugMode = true, postToWordPress = true } = body;

    const evaluator = new ArxivPaperEvaluator();
    const { results, articles } = await evaluator.evaluateNewPapersWithArticles(debugMode, postToWordPress);

    return NextResponse.json({
      success: true,
      date: new Date().toISOString().split('T')[0], // 現在の日付を返す
      totalPapers: results.length,
      results: results.map(result => ({
        paper: result.paper,
        evaluation: result.evaluation,
        formattedOutput: result.formattedOutput
      })),
      articles: articles
    } as DateEvaluationResponse);

  } catch (error) {
    console.error('Error evaluating papers with articles by number:', error);
    return NextResponse.json({
      success: false,
      date: '',
      totalPapers: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as DateEvaluationResponse, { status: 500 });
  }
}