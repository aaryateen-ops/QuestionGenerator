import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Parses a string containing LaTeX math ($...$, \(...\), \frac, \int, etc.)
 * and renders LaTeX using KaTeX while preserving search highlights.
 */
export default function MathHighlightedText({ text, query = '', isDark = true, className = '' }) {
  const renderedContent = useMemo(() => {
    if (!text) return null;

    // Check if text has LaTeX math delimiters or common LaTeX macros
    const hasMath = /(\$|\\\(|\\\[|\\frac|\\int|\\sum|\\sqrt|\\alpha|\\beta|\\pi|\\lim)/.test(text);

    if (!hasMath) {
      // Plain text: just perform search highlight
      if (!query || !query.trim()) {
        return <span>{text}</span>;
      }
      const q = query.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return (
        <span>
          {parts.map((part, i) =>
            regex.test(part) ? (
              <mark
                key={i}
                className={`px-1 py-0.5 rounded font-semibold ${
                  isDark ? 'bg-amber-400/25 text-amber-200' : 'bg-amber-200 text-amber-950'
                }`}
              >
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </span>
      );
    }

    // Text contains math! Parse segments: either math ($...$, \(...\), or raw TeX) or plain text
    // Regex matches: $...$ or \(...\) or \[...\]
    const mathRegex = /(\$[^$]+\$|\\\([^\)]+\\\)|\\\[[^\]]+\\\])/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = mathRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      segments.push({ type: 'math', content: match[0] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({ type: 'text', content: text.substring(lastIndex) });
    }

    // If no delimiters found but has macros like \frac, \int, render entire string as math if it looks like pure TeX
    if (segments.length === 1 && segments[0].type === 'text') {
      const trimmed = text.trim();
      if (trimmed.startsWith('\\') || (trimmed.includes('\\frac') && !trimmed.includes(' '))) {
        try {
          const html = katex.renderToString(trimmed, { throwOnError: false, displayMode: false });
          return <span dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          // fallback
        }
      }
    }

    return (
      <span className={className}>
        {segments.map((seg, idx) => {
          if (seg.type === 'math') {
            // Strip delimiters
            let rawMath = seg.content;
            let displayMode = false;
            if (rawMath.startsWith('$$') && rawMath.endsWith('$$')) {
              rawMath = rawMath.slice(2, -2);
              displayMode = true;
            } else if (rawMath.startsWith('$') && rawMath.endsWith('$')) {
              rawMath = rawMath.slice(1, -1);
            } else if (rawMath.startsWith('\\(') && rawMath.endsWith('\\)')) {
              rawMath = rawMath.slice(2, -2);
            } else if (rawMath.startsWith('\\[') && rawMath.endsWith('\\]')) {
              rawMath = rawMath.slice(2, -2);
              displayMode = true;
            }

            try {
              const html = katex.renderToString(rawMath, { throwOnError: false, displayMode });
              return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch {
              return <span key={idx}>{seg.content}</span>;
            }
          }

          // Plain text segment: apply search query highlighting
          if (!query || !query.trim()) {
            return <span key={idx}>{seg.content}</span>;
          }

          const q = query.trim();
          const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escaped})`, 'gi');
          const parts = seg.content.split(regex);

          return (
            <span key={idx}>
              {parts.map((p, i) =>
                regex.test(p) ? (
                  <mark
                    key={i}
                    className={`px-1 py-0.5 rounded font-semibold ${
                      isDark ? 'bg-amber-400/25 text-amber-200' : 'bg-amber-200 text-amber-950'
                    }`}
                  >
                    {p}
                  </mark>
                ) : (
                  p
                )
              )}
            </span>
          );
        })}
      </span>
    );
  }, [text, query, isDark, className]);

  return renderedContent;
}
