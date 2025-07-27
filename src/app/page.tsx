'use client';

import { useState } from 'react';
import { EvaluationResponse, DateEvaluationResponse, PaperEvaluationResult } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'single' | 'date'>('single');
  const [arxivUrl, setArxivUrl] = useState('https://arxiv.org/abs/2507.14077');
  const [date, setDate] = useState('2025-01-20');
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<EvaluationResponse | null>(null);
  const [dateResults, setDateResults] = useState<DateEvaluationResponse | null>(null);

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
      const response = await fetch('/api/evaluate-by-date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date }),
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
          <h3 className="text-lg font-semibold text-blue-800 mb-2">評価結果サマリー</h3>
          <p className="text-blue-700">
            日付: {result.date} | 論文数: {result.totalPapers}件
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
              <p className="text-sm text-gray-600 mt-1">
                cs.AI, cs.CV, cs.LGカテゴリの論文を評価します
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
}

