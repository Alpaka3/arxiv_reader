'use client';

import { useState } from 'react';
import { EvaluationResponse, DateEvaluationResponse, PaperEvaluationResult, ArticleGenerationResult } from '@/lib/types';
import MathRenderer from '@/components/MathRenderer';

interface SectionResult {
  sectionName: string;
  content: string;
  prompt: string;
}

interface SectionGenerationResponse {
  success: boolean;
  sections: SectionResult[];
  error?: string;
}

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
    sections: SectionResult[];
  }>;
  error?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'single' | 'date' | 'sections'>('single');
  const [arxivUrl, setArxivUrl] = useState('https://arxiv.org/abs/2507.14077');
  const [date, setDate] = useState('2025-01-20');
  const [debugMode, setDebugMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<EvaluationResponse | null>(null);
  const [dateResults, setDateResults] = useState<DateEvaluationResponse | null>(null);
  const [dateSectionResults, setDateSectionResults] = useState<DateSectionEvaluationResponse | null>(null);
  const [generateArticles, setGenerateArticles] = useState(false);
  
  // 個別セクション生成用の状態
  const [sectionArxivUrl, setSectionArxivUrl] = useState('https://arxiv.org/abs/2507.14077');
  const [selectedSections, setSelectedSections] = useState<string[]>(['TL;DR', '背景・目的', 'この論文の良いところ', '論文の内容', '考察', '結論・まとめ']);
  const [sectionResults, setSectionResults] = useState<SectionGenerationResponse | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);

  const evaluateSinglePaper = async () => {
    if (!arxivUrl.trim()) {
      alert('ArxivのURLを入力してください');
      return;
    }

    setLoading(true);
    setSingleResult(null);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ arxivUrl }),
      });

      const data: EvaluationResponse = await response.json();
      setSingleResult(data);
    } catch (error) {
      console.error('Error:', error);
      setSingleResult({
        success: false,
        error: 'ネットワークエラーが発生しました'
      });
    } finally {
      setLoading(false);
    }
  };

  const evaluatePapersByDate = async () => {
    if (!date.trim()) {
      alert('日付を入力してください');
      return;
    }

    setLoading(true);
    setDateResults(null);
    setDateSectionResults(null);

    try {
      let endpoint: string;
      if (generateArticles) {
        // 個別セクション生成を使用
        endpoint = '/api/evaluate-with-sections';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ date, debugMode }),
        });

        const data: DateSectionEvaluationResponse = await response.json();
        setDateSectionResults(data);
      } else {
        // 従来の評価のみ
        endpoint = '/api/evaluate-by-date';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ date, debugMode }),
        });

        const data: DateEvaluationResponse = await response.json();
        setDateResults(data);
      }
    } catch (error) {
      console.error('Error:', error);
      if (generateArticles) {
        setDateSectionResults({
          success: false,
          date: '',
          totalPapers: 0,
          error: 'ネットワークエラーが発生しました'
        });
      } else {
        setDateResults({
          success: false,
          date: '',
          totalPapers: 0,
          error: 'ネットワークエラーが発生しました'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const generateArticleSections = async () => {
    if (!sectionArxivUrl.trim()) {
      alert('ArxivのURLを入力してください');
      return;
    }

    if (selectedSections.length === 0) {
      alert('生成するセクションを選択してください');
      return;
    }

    setSectionLoading(true);
    setSectionResults(null);

    try {
      // まず論文を評価して論文情報と評価結果を取得
      const evaluationResponse = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ arxivUrl: sectionArxivUrl }),
      });

      const evaluationData: EvaluationResponse = await evaluationResponse.json();
      
      if (!evaluationData.success || !evaluationData.formattedOutput) {
        throw new Error(evaluationData.error || '論文の評価に失敗しました');
      }

      // 論文情報と評価結果を使って個別セクションを生成
      const sectionResponse = await fetch('/api/generate-article-sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperInfo: evaluationData.formattedOutput.paperInfo,
          evaluation: evaluationData.formattedOutput,
          sections: selectedSections
        }),
      });

      const sectionData: SectionGenerationResponse = await sectionResponse.json();
      setSectionResults(sectionData);
    } catch (error) {
      console.error('Error:', error);
      setSectionResults({
        success: false,
        sections: [],
        error: 'ネットワークエラーが発生しました'
      });
    } finally {
      setSectionLoading(false);
    }
  };

  const renderSingleEvaluation = (result: EvaluationResponse) => {
    if (!result.success) {
      return (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">エラー</h3>
          <p className="text-red-700">{result.error}</p>
        </div>
      );
    }

    if (!result.formattedOutput) return null;

    return (
      <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-xl font-bold text-center mb-4">評価結果</h3>
        
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-green-800">
            最終スコア: {result.formattedOutput.point}点
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold mb-2">計算式:</h4>
          <p className="font-mono bg-white p-2 rounded border">
            {result.formattedOutput.calculation}
          </p>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold mb-2">理由:</h4>
          <div className="bg-white p-4 rounded border whitespace-pre-line">
            {result.formattedOutput.reasoning}
          </div>
        </div>

        {result.evaluation && (
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-blue-600 hover:text-blue-800">
              詳細スコア
            </summary>
            <div className="mt-2 p-4 bg-blue-50 rounded border">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>著名研究者: {result.evaluation.famousAuthorScore}点</div>
                <div>1st Author: {result.evaluation.firstAuthorScore}点</div>
                <div>革新性: {result.evaluation.innovationScore}点</div>
                <div>応用可能性: {result.evaluation.applicabilityScore}点</div>
                <div>学習実験ボーナス: {result.evaluation.learningExperimentBonus}点</div>
                <div>キャッチートピックボーナス: {result.evaluation.trendyTopicBonus}点</div>
                <div>Software Engineeringペナルティ: {result.evaluation.softwareEngineeringPenalty}点</div>
                <div>論理透明性ペナルティ: {result.evaluation.logicPenalty}点</div>
              </div>
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderDateEvaluation = (result: DateEvaluationResponse) => {
    if (!result.success) {
      return (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">エラー</h3>
          <p className="text-red-700">{result.error}</p>
        </div>
      );
    }

    if (!result.results || result.results.length === 0) {
      return (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">結果</h3>
          <p className="text-yellow-700">指定日付の論文が見つかりませんでした。</p>
        </div>
      );
    }

    return (
      <div className="mt-6 space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">評価結果サマリー（上位3件）</h3>
          <p className="text-blue-700">
            日付: {result.date} | 表示件数: {result.totalPapers}件
          </p>
        </div>

        {result.results.map((paperResult: PaperEvaluationResult, index: number) => (
          <div key={index} className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                {paperResult.paper.title}
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                著者: {paperResult.paper.authors.join(', ')}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                arXiv ID: {paperResult.paper.arxivId}
              </p>
              <p className="text-sm text-gray-600">
                カテゴリ: {paperResult.paper.subjects.join(', ')}
              </p>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <h5 className="font-semibold mb-2">Abstract:</h5>
              <p className="text-sm text-gray-700 line-clamp-3">
                {paperResult.paper.abstract}
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-semibold">評価結果</h5>
                <div className="text-xl font-bold text-green-600">
                  {paperResult.formattedOutput.point}点
                </div>
              </div>
              
              <div className="text-sm mb-2">
                <strong>計算式:</strong> {paperResult.formattedOutput.calculation}
              </div>
              
              <details className="text-sm">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  評価理由を表示
                </summary>
                <div className="mt-2 p-3 bg-blue-50 rounded whitespace-pre-line">
                  {paperResult.formattedOutput.reasoning}
                </div>
              </details>
            </div>
          </div>
        ))}

        {/* 解説記事の表示 */}
        {result.articles && result.articles.length > 0 && (
          <div className="mt-8">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-indigo-800 mb-2">📚 論文解説記事</h3>
              <p className="text-indigo-700">
                上位{result.articles.length}件の論文について詳細な解説記事を生成しました。
              </p>
            </div>
            
            {result.articles.map((article: ArticleGenerationResult, index: number) => (
              <div key={`article-${index}`}>
                {renderArticle(article)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Arxiv論文評価システム (OpenAI API版)
        </h1>

        {/* タブ切り替え */}
        <div className="flex mb-6 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'single'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            単一論文評価
          </button>
          <button
            onClick={() => setActiveTab('date')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'date'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            日付指定論文リスト評価
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'sections'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            個別セクション生成
          </button>
        </div>

        {/* 単一論文評価タブ */}
        {activeTab === 'single' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <label htmlFor="arxiv-url" className="block text-sm font-medium text-gray-700 mb-2">
                ArxivのURL:
              </label>
              <input
                id="arxiv-url"
                type="text"
                value={arxivUrl}
                onChange={(e) => setArxivUrl(e.target.value)}
                placeholder="https://arxiv.org/abs/2507.14077"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={evaluateSinglePaper}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '評価中...' : '論文を評価する'}
            </button>

            {singleResult && renderSingleEvaluation(singleResult)}
          </div>
        )}

        {/* 日付指定論文リスト評価タブ */}
        {activeTab === 'date' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <label htmlFor="date-input" className="block text-sm font-medium text-gray-700 mb-2">
                評価対象日付 (YYYY-MM-DD):
              </label>
              <input
                id="date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  DEBUGモード（各カテゴリ3件ずつ評価、上位3件のみ表示）
                </span>
              </label>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={generateArticles}
                  onChange={(e) => setGenerateArticles(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  📝 個別セクション生成（上位3件の論文について各セクションを個別プロンプトで生成）
                </span>
              </label>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {debugMode 
                  ? 'cs.AI, cs.CV, cs.LGカテゴリから各3件ずつ評価し、上位3件を表示します' 
                  : 'cs.AI, cs.CV, cs.LGカテゴリの全ての論文を評価します'
                }
                {generateArticles && (
                  <span className="block mt-1 text-purple-600 font-medium">
                    💡 個別セクション生成が有効です。評価後に上位3件の論文について各セクションを個別プロンプトで生成します。
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={evaluatePapersByDate}
              disabled={loading}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '評価中...' : '指定日付の論文を評価する'}
            </button>

            {dateResults && renderDateEvaluation(dateResults)}
            {dateSectionResults && renderDateSectionEvaluation(dateSectionResults)}
          </div>
        )}

        {/* 個別セクション生成タブ */}
        {activeTab === 'sections' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <label htmlFor="section-arxiv-url" className="block text-sm font-medium text-gray-700 mb-2">
                ArxivのURL:
              </label>
              <input
                id="section-arxiv-url"
                type="text"
                value={sectionArxivUrl}
                onChange={(e) => setSectionArxivUrl(e.target.value)}
                placeholder="https://arxiv.org/abs/2507.14077"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                生成するセクション:
              </label>
              <div className="space-y-2">
                {['TL;DR', '背景・目的', 'この論文の良いところ', '論文の内容', '考察', '結論・まとめ'].map((section) => (
                  <label key={section} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSections([...selectedSections, section]);
                        } else {
                          setSelectedSections(selectedSections.filter(s => s !== section));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      {section}
                      {section === '論文の内容' && (
                        <span className="text-xs text-purple-600 ml-1">(HTML記法)</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">💡 個別セクション生成の特徴:</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• 各セクションが個別のプロンプトで生成されます</li>
                <li>• 論文の内容セクションはHTML記法で数式を含む詳細な解説が生成されます</li>
                <li>• parseArticleContentの手間が省けるため、より効率的です</li>
                <li>• 使用したプロンプトも確認できます</li>
              </ul>
            </div>

            <button
              onClick={generateArticleSections}
              disabled={sectionLoading || selectedSections.length === 0}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {sectionLoading ? '生成中...' : '選択したセクションを生成する'}
            </button>

            {sectionResults && renderSectionResults(sectionResults)}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * 日付指定での個別セクション結果を表示するコンポーネント
   */
  function renderDateSectionEvaluation(result: DateSectionEvaluationResponse) {
    if (!result.success) {
      return (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">エラー</h3>
          <p className="text-red-700">{result.error}</p>
        </div>
      );
    }

    if (!result.sectionResults || result.sectionResults.length === 0) {
      return (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">結果なし</h3>
          <p className="text-yellow-700">生成されたセクションがありません。</p>
        </div>
      );
    }

    return (
      <div className="mt-6">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">📚 個別セクション生成結果</h3>
          <p className="text-green-700">
            {result.date}の論文{result.totalPapers}件について、各セクションを個別プロンプトで生成しました。
          </p>
        </div>

        {result.sectionResults.map((paperResult, paperIndex) => (
          <div key={`paper-sections-${paperIndex}`} className="mb-8">
            {/* 論文情報ヘッダー */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-t-lg">
              <h4 className="text-lg font-bold text-blue-800 mb-2">
                📄 {paperResult.paper.title}
              </h4>
              <div className="text-sm text-blue-600 mb-2">
                <span className="font-medium">arXiv ID:</span> {paperResult.paper.arxivId} | 
                <span className="font-medium"> 評価スコア:</span> {paperResult.evaluation.finalScore}点
              </div>
              <div className="text-sm text-blue-600">
                <span className="font-medium">著者:</span> {paperResult.paper.authors.join(', ')}
              </div>
            </div>

            {/* 各セクション */}
            <div className="border-l border-r border-b border-blue-200 rounded-b-lg bg-white">
              {paperResult.sections.map((section, sectionIndex) => (
                <div key={`section-${sectionIndex}`} className="border-b border-gray-100 last:border-b-0">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-md font-semibold text-purple-700">
                        📝 {section.sectionName}
                      </h5>
                      {section.sectionName === '論文の内容' && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                          HTML記法
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <div className="p-3 bg-gray-50 rounded border">
                        <MathRenderer 
                          content={section.content} 
                          className="text-gray-700 leading-relaxed text-sm prose prose-sm max-w-none" 
                        />
                      </div>
                    </div>


                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /**
   * 個別セクション結果を表示するコンポーネント
   */
  function renderSectionResults(results: SectionGenerationResponse) {
    if (!results.success) {
      return (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">エラー</h3>
          <p className="text-red-700">{results.error}</p>
        </div>
      );
    }

    return (
      <div className="mt-6 space-y-6">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">✅ 生成完了</h3>
          <p className="text-green-700">
            {results.sections.length}個のセクションが正常に生成されました。
          </p>
        </div>

        {results.sections.map((section, index) => (
          <div key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg shadow-lg">
            <div className="p-4 border-b border-purple-200">
              <h4 className="text-lg font-bold text-purple-800">
                📝 {section.sectionName}
              </h4>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-2">生成されたコンテンツ:</h5>
                <div className="p-4 bg-white rounded-lg border border-purple-100">
                  <MathRenderer 
                    content={section.content} 
                    className="text-gray-700 leading-relaxed prose prose-sm max-w-none" 
                  />
                </div>
              </div>


            </div>
          </div>
        ))}
      </div>
    );
  }

  /**
   * 論文解説記事を表示するコンポーネント
   */
  function renderArticle(article: ArticleGenerationResult) {
    const { paper, article: articleContent, evaluation } = article;
    
    return (
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg shadow-lg">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-purple-800 mb-2">
            📄 {articleContent.title}
          </h3>
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium">arXiv ID:</span> {paper.arxivId} | 
            <span className="font-medium"> 評価スコア:</span> {evaluation.finalScore}点 |
            <span className="font-medium"> 生成日時:</span> {new Date(articleContent.generatedAt).toLocaleString('ja-JP')}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border border-purple-100">
            <h4 className="font-semibold text-purple-700 mb-2">📝 TL;DR</h4>
            <MathRenderer content={articleContent.tldr} className="text-gray-700 leading-relaxed" />
          </div>

          <div className="p-4 bg-white rounded-lg border border-purple-100">
            <h4 className="font-semibold text-purple-700 mb-2">🎯 背景・目的</h4>
            <MathRenderer content={articleContent.background} className="text-gray-700 leading-relaxed" />
          </div>

          <div className="p-4 bg-white rounded-lg border border-purple-100">
            <h4 className="font-semibold text-purple-700 mb-2">✨ この論文の良いところ</h4>
            <MathRenderer content={articleContent.goodPoints} className="text-gray-700 leading-relaxed" />
          </div>

          <div className="p-6 bg-white rounded-lg border border-purple-100">
            <h4 className="font-semibold text-purple-700 mb-4 text-lg">
              📖 論文の内容 
              <span className="text-xs font-normal text-gray-500 ml-2">
                ({articleContent.content.length}文字)
              </span>
            </h4>
            <div className="pr-2">
              <MathRenderer 
                content={articleContent.content} 
                className="text-gray-700 leading-relaxed text-sm" 
              />
            </div>
            {articleContent.content.length < 100 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-700 text-sm">
                  ⚠️ 論文の内容が短すぎます。記事生成に問題がある可能性があります。
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-white rounded-lg border border-purple-100">
            <h4 className="font-semibold text-purple-700 mb-2">🤔 考察</h4>
            <MathRenderer content={articleContent.consideration} className="text-gray-700 leading-relaxed" />
          </div>

          <div className="p-4 bg-white rounded-lg border border-purple-100">
            <h4 className="font-semibold text-purple-700 mb-2">🎉 結論・まとめ</h4>
            <MathRenderer content={articleContent.conclusion} className="text-gray-700 leading-relaxed" />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-purple-200">
          <details className="text-sm">
            <summary className="cursor-pointer text-purple-600 hover:text-purple-800 font-medium">
              📊 評価詳細を表示
            </summary>
            <div className="mt-2 p-3 bg-purple-50 rounded">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>著名研究者: {evaluation.famousAuthorScore}点</div>
                <div>1st Author: {evaluation.firstAuthorScore}点</div>
                <div>革新性: {evaluation.innovationScore}点</div>
                <div>応用可能性: {evaluation.applicabilityScore}点</div>
                <div>学習実験ボーナス: {evaluation.learningExperimentBonus}点</div>
                <div>キャッチートピックボーナス: {evaluation.trendyTopicBonus}点</div>
                <div>Software Engineeringペナルティ: {evaluation.softwareEngineeringPenalty}点</div>
                <div>論理透明性ペナルティ: {evaluation.logicPenalty}点</div>
              </div>
            </div>
          </details>
        </div>
      </div>
    );
  }
}

