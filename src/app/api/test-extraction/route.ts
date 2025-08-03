import { NextRequest, NextResponse } from 'next/server';
import { Ar5ivParser } from '@/lib/ar5ivParser';

export async function GET() {
  return NextResponse.json({
    message: 'Figure and Table Extraction Test API',
    usage: 'POST /api/test-extraction with { "arxivId": "2507.14077" }'
  });
}

export async function POST(request: NextRequest) {
  try {
    const { arxivId } = await request.json();
    
    if (!arxivId) {
      return NextResponse.json(
        { error: 'arxivId is required' },
        { status: 400 }
      );
    }

    console.log(`Testing extraction for arXiv:${arxivId}`);
    
    const parser = new Ar5ivParser();
    
    // 詳細な抽出情報を取得
    const extractionInfo = await parser.getDetailedExtractionInfo(arxivId);
    
    // 基本的な論文内容も取得
    const paperContent = await parser.parsePaper(arxivId);
    
    const response = {
      arxivId,
      extractionInfo,
      basicInfo: {
        abstract: paperContent.abstract,
        sectionsFound: Object.keys(paperContent.sections),
        fullTextLength: paperContent.fullText.length
      },
      detailedResults: {
        figures: paperContent.figures,
        tables: paperContent.tables.map(t => ({
          ...t,
          structuredData: t.structuredData ? {
            ...t.structuredData,
            sampleRows: t.structuredData.rows.slice(0, 3) // 最初の3行のみ表示
          } : undefined
        })),
        equations: paperContent.equations.slice(0, 5) // 最初の5個の数式のみ表示
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Extraction test failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test extraction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}