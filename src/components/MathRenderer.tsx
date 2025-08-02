'use client';

import { useEffect, useRef } from 'react';
import { marked } from 'marked';

interface MathRendererProps {
  content: string;
  className?: string;
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      console.log('Original content:', content.substring(0, 200) + '...');
      
      // まずMarkdownをHTMLに変換
      let htmlContent = marked(content) as string;
      console.log('After Markdown conversion:', htmlContent.substring(0, 200) + '...');
      
      // KaTeXが利用可能な場合は数式をレンダリング
      if (typeof window !== 'undefined' && (window as any).katex) {
        const katex = (window as any).katex;
        
        // インライン数式（$...$）を処理
        htmlContent = htmlContent.replace(/\$([^$]+)\$/g, (match, formula) => {
          try {
            return katex.renderToString(formula, { displayMode: false });
          } catch (error) {
            console.warn('KaTeX rendering error:', error);
            return match;
          }
        });

        // ディスプレイ数式（$$...$$）を処理
        htmlContent = htmlContent.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
          try {
            return katex.renderToString(formula, { displayMode: true });
          } catch (error) {
            console.warn('KaTeX rendering error:', error);
            return match;
          }
        });
      }

      console.log('Final HTML content:', htmlContent.substring(0, 200) + '...');
      containerRef.current.innerHTML = htmlContent;
    }
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`math-content prose prose-purple max-w-none ${className}`}
      style={{ 
        lineHeight: '1.6',
        wordBreak: 'break-word'
      }}
    />
  );
}