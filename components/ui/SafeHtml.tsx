'use client';

/**
 * SafeHtml — renders trusted HTML content (e.g. AI-generated descriptions)
 * with XSS sanitization. No external dependencies.
 *
 * Allowed tags: h1-h6, p, ul, ol, li, strong, b, em, i, br, a, span, div, blockquote, hr
 * Allowed attributes: href (a only, http/https only), target, rel, class
 * Strips: script, style, iframe, object, embed, form, input, on* attributes
 */

import { useMemo } from 'react';

const ALLOWED_TAGS = new Set([
  'h1','h2','h3','h4','h5','h6',
  'p','ul','ol','li',
  'strong','b','em','i',
  'br','hr',
  'a','span','div','blockquote',
]);

const BLOCK_TAGS = new Set(['h1','h2','h3','h4','h5','h6','p','ul','ol','li','blockquote','div','hr']);

function sanitize(html: string): string {
  // Remove dangerous elements entirely (with content)
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<form[\s\S]*?>/gi, '')
    .replace(/<input[\s\S]*?>/gi, '');

  // Remove on* event attributes
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // Strip javascript: in hrefs
  clean = clean.replace(/href\s*=\s*["']\s*javascript:[^"']*/gi, 'href="#"');

  // Remove disallowed tags but keep their inner text
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag) => {
    const lower = tag.toLowerCase();
    if (ALLOWED_TAGS.has(lower)) {
      // For <a> allow href, target, rel only
      if (lower === 'a') {
        const href = match.match(/href\s*=\s*["']([^"']*)["']/i);
        const hrefVal = href ? href[1] : '';
        const safeHref = hrefVal.startsWith('http://') || hrefVal.startsWith('https://') || hrefVal.startsWith('/')
          ? hrefVal : '#';
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`;
      }
      // For closing tags, pass through
      if (match.startsWith('</')) return match;
      // For self-closing / void tags
      if (lower === 'br' || lower === 'hr') return `<${lower}>`;
      // Strip all attributes except class from allowed block/inline tags
      return `<${lower}>`;
    }
    // Disallowed tag — strip tag, keep content
    return '';
  });

  return clean;
}

function looksLikeHtml(text: string): boolean {
  return /<[a-zA-Z][^>]*>/.test(text);
}

interface SafeHtmlProps {
  html: string | null | undefined;
  fallback?: string;
  className?: string;
}

export default function SafeHtml({ html, fallback = '', className = '' }: SafeHtmlProps) {
  const { content, isHtml } = useMemo(() => {
    const raw = (html ?? fallback ?? '').trim();
    if (!raw) return { content: fallback, isHtml: false };
    const isH = looksLikeHtml(raw);
    return { content: isH ? sanitize(raw) : raw, isHtml: isH };
  }, [html, fallback]);

  if (!content) return null;

  if (isHtml) {
    return (
      <div
        className={`prose-description ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <p className={`whitespace-pre-line ${className}`}>
      {content}
    </p>
  );
}
