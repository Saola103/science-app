'use client';

import React from 'react';

/**
 * Lightweight Markdown renderer (no external dependencies).
 * Handles: **bold**, ### headings, ## headings, # headings,
 *          - bullet lists, numbered lists, blank-line paragraphs,
 *          [text](url) links, `inline code`.
 */
export function MarkdownText({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    if (listType === 'ul') {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-2 pl-2">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">{renderInline(item)}</li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 my-2 pl-2">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">{renderInline(item)}</li>
          ))}
        </ol>
      );
    }
    listItems = [];
    listType = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Heading ###
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-base font-black text-slate-900 mt-4 mb-1 tracking-tight">
          {renderInline(h3Match[1])}
        </h3>
      );
      continue;
    }

    // Heading ##
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-lg font-black text-slate-900 mt-5 mb-2 tracking-tight">
          {renderInline(h2Match[1])}
        </h2>
      );
      continue;
    }

    // Heading #
    const h1Match = line.match(/^#\s+(.+)/);
    if (h1Match) {
      flushList();
      elements.push(
        <h1 key={key++} className="text-xl font-black text-slate-900 mt-6 mb-2 tracking-tight">
          {renderInline(h1Match[1])}
        </h1>
      );
      continue;
    }

    // Unordered list item (- or *)
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(ulMatch[1]);
      continue;
    }

    // Ordered list item (1. 2. etc.)
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(olMatch[1]);
      continue;
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      flushList();
      if (elements.length > 0) {
        elements.push(<div key={key++} className="h-2" />);
      }
      continue;
    }

    // Regular paragraph line
    flushList();
    elements.push(
      <p key={key++} className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return (
    <div className={`space-y-1 ${className}`}>
      {elements}
    </div>
  );
}

/** Render inline markdown: **bold**, *italic*, `code`, [text](url) */
function renderInline(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  // Pattern: **bold** | *italic* | `code` | [text](url)
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match;
  let keyIdx = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[0].startsWith('**')) {
      result.push(<strong key={keyIdx++} className="font-bold text-slate-900">{match[2]}</strong>);
    } else if (match[0].startsWith('*')) {
      result.push(<em key={keyIdx++} className="italic">{match[3]}</em>);
    } else if (match[0].startsWith('`')) {
      result.push(
        <code key={keyIdx++} className="bg-slate-100 text-sky-700 rounded px-1 py-0.5 text-xs font-mono">
          {match[4]}
        </code>
      );
    } else if (match[0].startsWith('[')) {
      result.push(
        <a key={keyIdx++} href={match[6]} target="_blank" rel="noreferrer"
          className="text-sky-600 hover:underline">
          {match[5]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}
