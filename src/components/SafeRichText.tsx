import { useMemo } from 'react';

/**
 * Render limited HTML for quiz content:
 * - allow: br, svg subtree (shape diagrams stored as SVG markup)
 * - escape everything else
 * Not a full sanitizer; for trusted DB content only.
 */
function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Keep only simple SVG tags + br; drop scripts/events */
function sanitizeSvgAndBr(raw: string): string {
  if (!raw) return '';
  // Normalize self-closing-ish and line breaks first for detection
  let s = raw;

  // Protect <svg>...</svg> blocks
  const blocks: string[] = [];
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, (m) => {
    // strip event handlers and foreign tags inside svg
    let svg = m
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '');
    // allow only a whitelist of tags inside svg
    // remove tags that are not in allowlist (keep text)
    svg = svg.replace(/<\/?([a-z0-9:-]+)[^>]*>/gi, (tag, name) => {
      const n = String(name).toLowerCase();
      const allow = new Set([
        'svg','g','path','rect','circle','ellipse','line','polyline','polygon',
        'text','tspan','defs','use','title','desc'
      ]);
      if (!allow.has(n)) return '';
      // strip dangerous attrs
      if (tag.startsWith('</')) return `</${n}>`;
      // rebuild open tag: keep safe attrs only
      const safeAttrs = tag
        .replace(/^<[^\s>]+/i, '')
        .replace(/>$/,'')
        .replace(/\s(on\w+|href|xlink:href|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      const open = tag.match(/^<([a-z0-9:-]+)/i)?.[1]?.toLowerCase() || n;
      return `<${open}${safeAttrs}>`;
    });
    const i = blocks.length;
    blocks.push(svg);
    return `@@SVG${i}@@`;
  });

  // escape rest, then restore br + svg
  s = escapeText(s);
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '<br/>');
  s = s.replace(/@@SVG(\d+)@@/g, (_, n) => blocks[Number(n)] || '');
  return s;
}

export default function SafeRichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const html = useMemo(() => sanitizeSvgAndBr(text || ''), [text]);
  if (!text) return null;
  // If no tags after sanitize, plain text is fine
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
