'use client';

import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string | number | null | undefined;
  className?: string;
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (content === null || content === undefined || content === '') {
      containerRef.current.innerHTML = '';
      return;
    }

    const safeString = String(content);

    // Process text: normalize protocol-relative image URLs and parse LaTeX formulas
    try {
      let processed = safeString
        .replace(/src=["']\/\/([^"']+)["']/g, 'src="https://$1"')
        .replace(/src=\/\/([^\s>]+)/g, 'src="https://$1"');

      // 1. Handle Display/Block math: $$...$$ or \[...\]
      processed = processed
        .replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
          try {
            return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
          } catch {
            return `$$${math}$$`;
          }
        })
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
          try {
            return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
          } catch {
            return `\\[${math}\\]`;
          }
        });

      // 2. Handle Inline math: \(...\) or $...$
      processed = processed
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
          try {
            return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
          } catch {
            return `\\(${math}\\)`;
          }
        })
        .replace(/\$([^\$]+?)\$/g, (_, math) => {
          try {
            return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
          } catch {
            return `$${math}$`;
          }
        });

      containerRef.current.innerHTML = processed;
    } catch {
      containerRef.current.textContent = safeString;
    }
  }, [content]);

  return <div ref={containerRef} className={`selectable-text ${className}`} />;
}
