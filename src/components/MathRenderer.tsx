'use client';

import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // KaTeXが利用可能な場合は数式をレンダリング
      if (typeof window !== 'undefined' && (window as any).katex) {
        const katex = (window as any).katex;
        
        // インライン数式（$...$）を処理
        let processedContent = content.replace(/\$([^$]+)\$/g, (match, formula) => {
          try {
            return katex.renderToString(formula, { displayMode: false });
          } catch (error) {
            console.warn('KaTeX rendering error:', error);
            return match;
          }
        });

        // ディスプレイ数式（$$...$$）を処理
        processedContent = processedContent.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
          try {
            return katex.renderToString(formula, { displayMode: true });
          } catch (error) {
            console.warn('KaTeX rendering error:', error);
            return match;
          }
        });

        containerRef.current.innerHTML = processedContent;
      } else {
        // KaTeXが利用できない場合は、数式記号をそのまま表示
        containerRef.current.innerHTML = content;
      }
    }
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`math-content ${className}`}
      style={{ 
        lineHeight: '1.6',
        wordBreak: 'break-word'
      }}
    />
  );
}