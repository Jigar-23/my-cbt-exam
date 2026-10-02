'use client';

import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string | number | null | undefined;
  className?: string;
}

/**
 * Robust HTML entity decoder that unescapes HTML-escaped characters
 * (&lt;, &gt;, &quot;, &amp;, &#39;, &nbsp;, math symbols) without executing scripts.
 */
function decodeHtmlEntities(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  if (!raw.includes('&')) return raw;

  let str = raw;
  // Up to two passes to safely handle double-encoded entities (e.g. &amp;lt;p&amp;gt;)
  for (let pass = 0; pass < 2; pass++) {
    if (!str.includes('&')) break;
    str = str
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;|&apos;|&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&plusmn;/g, '±')
      .replace(/&times;/g, '×')
      .replace(/&divide;/g, '÷')
      .replace(/&deg;/g, '°')
      .replace(/&minus;/g, '−')
      .replace(/&le;/g, '≤')
      .replace(/&ge;/g, '≥')
      .replace(/&ne;/g, '≠')
      .replace(/&asymp;/g, '≈')
      .replace(/&infin;/g, '∞')
      .replace(/&pi;/g, 'π')
      .replace(/&theta;/g, 'θ')
      .replace(/&alpha;/g, 'α')
      .replace(/&beta;/g, 'β')
      .replace(/&radic;/g, '√')
      .replace(/&amp;/g, '&');
  }
  return str;
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
    const decoded = decodeHtmlEntities(safeString);

    // Process text: normalize protocol-relative image URLs and parse LaTeX formulas
    try {
      let processed = decoded
        .replace(/src=["']\/\/([^"']+)["']/g, 'src="https://$1"')
        .replace(/src=\/\/([^\s>]+)/g, 'src="https://$1"');

      // Strip dangerous script tags if any
      processed = processed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

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
      containerRef.current.innerHTML = decoded;
    }
  }, [content]);

  return <div ref={containerRef} className={`selectable-text ${className}`} />;
}
