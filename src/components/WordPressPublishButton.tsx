'use client';

import { useState } from 'react';
import { ArticleGenerationResult } from '@/lib/types';

interface WordPressPublishButtonProps {
  articleResult: ArticleGenerationResult;
}

interface PublishResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  previewUrl?: string;
  editUrl?: string;
  error?: string;
}

export default function WordPressPublishButton({ articleResult }: WordPressPublishButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    endpoint: '',
    username: '',
    appPassword: '',
    status: 'draft' as 'draft' | 'publish'
  });

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishResult(null);

    try {
      const response = await fetch('/api/wordpress/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articles: [articleResult],
          config: config.endpoint ? {
            endpoint: config.endpoint,
            username: config.username,
            appPassword: config.appPassword
          } : undefined,
          options: {
            testConnection: true,
            status: config.status
          }
        })
      });

      const result = await response.json();

      if (result.success && result.results?.[0]) {
        const articleResult = result.results[0];
        setPublishResult({
          success: articleResult.success,
          postId: articleResult.postId,
          postUrl: articleResult.postUrl,
          previewUrl: articleResult.previewUrl,
          editUrl: articleResult.editUrl,
          error: articleResult.error
        });
      } else {
        setPublishResult({
          success: false,
          error: result.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      setPublishResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const testConnection = async () => {
    try {
      const params = new URLSearchParams({ action: 'test-connection' });
      const response = await fetch(`/api/wordpress/publish?${params}`);
      const result = await response.json();
      
      if (result.success) {
        alert(`接続成功！\nサイト: ${result.siteInfo?.name}\nURL: ${result.siteInfo?.url}`);
      } else {
        alert(`接続失敗: ${result.error}`);
      }
    } catch (error) {
      alert(`接続テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-800 flex items-center">
          📝 WordPress投稿
        </h3>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showConfig ? '設定を隠す' : '設定を表示'}
        </button>
      </div>

      {showConfig && (
        <div className="mb-4 p-4 bg-white rounded border space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WordPress URL
            </label>
            <input
              type="url"
              value={config.endpoint}
              onChange={(e) => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
              placeholder="https://your-wordpress-site.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
              placeholder="your-username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              アプリケーションパスワード
            </label>
            <input
              type="password"
              value={config.appPassword}
              onChange={(e) => setConfig(prev => ({ ...prev, appPassword: e.target.value }))}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              投稿ステータス
            </label>
            <select
              value={config.status}
              onChange={(e) => setConfig(prev => ({ ...prev, status: e.target.value as 'draft' | 'publish' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">下書き</option>
              <option value="publish">公開</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={testConnection}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              接続テスト
            </button>
          </div>
          <div className="text-xs text-gray-500">
            ※ 設定を空にした場合は環境変数の値が使用されます
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={handlePublish}
          disabled={isPublishing}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
            isPublishing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isPublishing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              投稿中...
            </span>
          ) : (
            `WordPressに投稿 (${config.status === 'draft' ? '下書き' : '公開'})`
          )}
        </button>
      </div>

      {publishResult && (
        <div className={`mt-4 p-4 rounded-lg ${
          publishResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {publishResult.success ? (
            <div>
              <h4 className="font-semibold text-green-800 mb-2">✅ 投稿成功！</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>投稿ID:</strong> {publishResult.postId}
                </div>
                {publishResult.postUrl && (
                  <div>
                    <strong>投稿URL:</strong>{' '}
                    <a 
                      href={publishResult.postUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {publishResult.postUrl}
                    </a>
                  </div>
                )}
                <div className="flex space-x-4 mt-3">
                  {publishResult.previewUrl && (
                    <a
                      href={publishResult.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      プレビュー
                    </a>
                  )}
                  {publishResult.editUrl && (
                    <a
                      href={publishResult.editUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                    >
                      編集
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold text-red-800 mb-2">❌ 投稿失敗</h4>
              <p className="text-red-700 text-sm">{publishResult.error}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-600">
        <details>
          <summary className="cursor-pointer hover:text-gray-800">
            📋 投稿される内容のプレビュー
          </summary>
          <div className="mt-2 p-3 bg-white rounded border max-h-40 overflow-y-auto">
            <div><strong>タイトル:</strong> {articleResult.article.title}</div>
            <div><strong>TL;DR:</strong> {articleResult.article.tldr}</div>
            <div><strong>arXiv ID:</strong> {articleResult.paper.arxivId}</div>
            <div><strong>評価スコア:</strong> {articleResult.evaluation.finalScore}点</div>
          </div>
        </details>
      </div>
    </div>
  );
}