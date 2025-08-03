'use client';

import { useState } from 'react';
import { EvaluationResponse, DateEvaluationResponse, PaperEvaluationResult, ArticleGenerationResult } from '@/lib/types';
import MathRenderer from '@/components/MathRenderer';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'single' | 'date'>('single');
  const [arxivUrl, setArxivUrl] = useState('https://arxiv.org/abs/2507.14077');
  const [date, setDate] = useState('2025-01-20');
  const [debugMode, setDebugMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<EvaluationResponse | null>(null);
  const [dateResults, setDateResults] = useState<DateEvaluationResponse | null>(null);
  const [generateArticles, setGenerateArticles] = useState(false);

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

    try {
      const endpoint = generateArticles ? '/api/evaluate-with-articles' : '/api/evaluate-by-date';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, debugMode }),
      });

      const data: DateEvaluationResponse = await response.json();
      setDateResults(data);
    } catch (error) {
      console.error('Error:', error);
      setDateResults({
        success: false,
        date: '',
        totalPapers: 0,
        error: 'ネットワークエラーが発生しました'
      });
    } finally {
      setLoading(false);
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
                  📝 解説記事を生成する（上位3件の論文について詳細な記事を自動生成）
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
                    💡 解説記事生成が有効です。評価後に上位3件の詳細記事を自動生成します。
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
          </div>
        )}
      </div>
    </div>
  );

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
                className="text-gray-700 leading-relaxed whitespace-pre-line text-sm" 
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

          {/* 図の表示セクション */}
          {articleContent.figures && articleContent.figures.length > 0 && (
            <div className="p-4 bg-white rounded-lg border border-purple-100">
              <h4 className="font-semibold text-purple-700 mb-4">🖼️ 論文の図表</h4>
              <div className="space-y-4">
                {articleContent.figures.map((figure, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-800 mb-2">{figure.figureNumber}</h5>
                    {figure.imageUrl && (
                      <div className="mb-3">
                        <img 
                          src={figure.imageUrl} 
                          alt={figure.figureNumber}
                          className="max-w-full h-auto rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <p className="text-sm text-gray-600">{figure.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 表の表示セクション */}
          {articleContent.tables && articleContent.tables.length > 0 && (
            <div className="p-4 bg-white rounded-lg border border-purple-100">
              <h4 className="font-semibold text-purple-700 mb-4">📊 論文の表</h4>
              <div className="space-y-4">
                {articleContent.tables.map((table, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-800 mb-2">{table.tableNumber}</h5>
                    <p className="text-sm text-gray-600 mb-3">{table.caption}</p>
                    
                    {/* 構造化されたテーブルデータがある場合 */}
                    {table.structuredData && table.structuredData.headers && table.structuredData.headers.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-300 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {table.structuredData.headers.map((header, headerIndex) => (
                                <th key={headerIndex} className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.structuredData.rows.slice(0, 10).map((row, rowIndex) => (
                              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="border border-gray-300 px-3 py-2 text-gray-700">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {table.structuredData.rows.length > 10 && (
                          <p className="text-xs text-gray-500 mt-2">
                            （最初の10行のみ表示。全{table.structuredData.rows.length}行）
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* 構造化データがない場合は生のテキストを表示 */}
                    {(!table.structuredData || !table.structuredData.headers || table.structuredData.headers.length === 0) && (
                      <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                        {table.content}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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

