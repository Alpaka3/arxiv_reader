'use client';

import React, { useState } from 'react';

interface FigureData {
  figureNumber: string;
  caption: string;
  imageUrl?: string;
}

interface FigureRendererProps {
  figure: FigureData;
  index: number;
}

export const FigureRenderer: React.FC<FigureRendererProps> = ({ figure, index }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullSize, setShowFullSize] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const downloadImage = async () => {
    if (!figure.imageUrl) return;

    try {
      const response = await fetch(figure.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${figure.figureNumber.replace(/\s+/g, '_')}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  return (
    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-3">
        <h5 className="font-medium text-gray-800 text-lg">{figure.figureNumber}</h5>
        <div className="flex gap-2">
          {figure.imageUrl && imageLoaded && (
            <>
              <button
                onClick={() => setShowFullSize(!showFullSize)}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                {showFullSize ? '縮小表示' : '拡大表示'}
              </button>
              <button
                onClick={downloadImage}
                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                ダウンロード
              </button>
            </>
          )}
        </div>
      </div>

      {/* 画像表示部分 */}
      {figure.imageUrl ? (
        <div className="mb-4">
          {!imageLoaded && !imageError && (
            <div className="flex items-center justify-center h-32 bg-gray-100 rounded">
              <div className="text-gray-500 text-sm">画像を読み込み中...</div>
            </div>
          )}
          
          {imageError && (
            <div className="flex items-center justify-center h-32 bg-red-50 border border-red-200 rounded">
              <div className="text-center text-red-600 text-sm">
                <div className="mb-2">❌ 画像の読み込みに失敗しました</div>
                <div className="text-xs text-gray-500">URL: {figure.imageUrl}</div>
              </div>
            </div>
          )}

          <img
            src={figure.imageUrl}
            alt={figure.figureNumber}
            className={`
              ${showFullSize ? 'w-full' : 'max-w-full'} 
              h-auto rounded border shadow-sm transition-all duration-300
              ${!imageLoaded ? 'hidden' : 'block'}
            `}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              maxHeight: showFullSize ? 'none' : '400px',
              objectFit: 'contain'
            }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 bg-gray-50 border border-gray-200 rounded mb-4">
          <div className="text-center text-gray-500 text-sm">
            <div className="mb-2">🖼️ 画像が利用できません</div>
            <div className="text-xs">ArXivから画像を取得できませんでした</div>
          </div>
        </div>
      )}

      {/* キャプション */}
      <div className="text-sm text-gray-700 leading-relaxed">
        <span className="font-medium">{figure.figureNumber}:</span> {figure.caption}
      </div>

      {/* 画像情報 */}
      {figure.imageUrl && imageLoaded && (
        <div className="mt-2 text-xs text-gray-500">
          画像URL: <a href={figure.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {figure.imageUrl}
          </a>
        </div>
      )}
    </div>
  );
};