import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(html);
}

export function markdownToPlainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function measureTextWidth(value: string, fontSize: number): number {
  let width = 0;

  for (const character of Array.from(value)) {
    const codePoint = character.codePointAt(0) ?? 0;
    const isWide = codePoint > 127;
    width += isWide ? fontSize : fontSize * 0.56;
  }

  return width;
}

export function truncateToWidth(value: string, maxWidth: number, fontSize: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (measureTextWidth(clean, fontSize) <= maxWidth) {
    return clean;
  }

  let result = '';
  for (const character of Array.from(clean)) {
    const next = `${result}${character}…`;
    if (measureTextWidth(next, fontSize) > maxWidth) {
      break;
    }
    result += character;
  }

  return `${result}…`;
}
