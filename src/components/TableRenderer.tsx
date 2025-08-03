'use client';

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface TableData {
  tableNumber: string;
  caption: string;
  content: string;
  structuredData?: {
    headers: string[];
    rows: string[][];
    textContent: string;
  };
}

interface TableRendererProps {
  table: TableData;
  index: number;
  defaultAsImage?: boolean;
}

export const TableRenderer: React.FC<TableRendererProps> = ({ table, index, defaultAsImage = false }) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [showAsImage, setShowAsImage] = useState(defaultAsImage);
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');

  const convertToImage = async () => {
    if (!tableRef.current) return;

    setIsConverting(true);
    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 高解像度化
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: tableRef.current.scrollWidth,
        height: tableRef.current.scrollHeight,
      });

      const mimeType = imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(mimeType, 0.9);
      setImageUrl(dataUrl);
      setShowAsImage(true);
    } catch (error) {
      console.error('Failed to convert table to image:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;

    const link = document.createElement('a');
    const extension = imageFormat === 'jpeg' ? 'jpg' : 'png';
    link.download = `${table.tableNumber.replace(/\s+/g, '_')}.${extension}`;
    link.href = imageUrl;
    link.click();
  };

  return (
    <div key={index} className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h5 className="font-medium text-gray-800">{table.tableNumber}</h5>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowAsImage(!showAsImage)}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            {showAsImage ? '表形式で表示' : '画像で表示'}
          </button>
          
          <select
            value={imageFormat}
            onChange={(e) => setImageFormat(e.target.value as 'png' | 'jpeg')}
            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
          
          {!imageUrl && (
            <button
              onClick={convertToImage}
              disabled={isConverting}
              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
            >
              {isConverting ? '変換中...' : `${imageFormat.toUpperCase()}化`}
            </button>
          )}
          
          {imageUrl && (
            <>
              <button
                onClick={convertToImage}
                disabled={isConverting}
                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors disabled:opacity-50"
              >
                {isConverting ? '再変換中...' : '再変換'}
              </button>
              <button
                onClick={downloadImage}
                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
              >
                ダウンロード
              </button>
            </>
          )}
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{table.caption}</p>

      {/* 画像表示モード */}
      {showAsImage && imageUrl && (
        <div className="mb-4">
          <img 
            src={imageUrl} 
            alt={table.tableNumber}
            className="max-w-full h-auto border rounded"
          />
        </div>
      )}

      {/* 表形式表示モード（画像化の対象） */}
      {!showAsImage && (
        <div ref={tableRef} className="bg-white p-4 rounded border">
          {/* 構造化されたテーブルデータがある場合 */}
          {table.structuredData && table.structuredData.headers && table.structuredData.headers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {table.structuredData.headers.map((header, headerIndex) => (
                      <th key={headerIndex} className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 bg-gray-100">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.structuredData.rows.slice(0, 20).map((row, rowIndex) => (
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
              {table.structuredData.rows.length > 20 && (
                <p className="text-xs text-gray-500 mt-2">
                  （最初の20行のみ表示。全{table.structuredData.rows.length}行）
                </p>
              )}
            </div>
          ) : (
            /* 構造化データがない場合は生のテキストを表示 */
            <div className="font-mono text-xs text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap border">
              {table.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
};