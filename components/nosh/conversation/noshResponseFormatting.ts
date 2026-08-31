export interface NoshResponseParagraph {
  kind: 'paragraph';
  text: string;
}

export interface NoshResponseBullet {
  kind: 'bullet';
  text: string;
}

export type NoshResponseBlock = NoshResponseParagraph | NoshResponseBullet;

const BULLET_LINE = /^(?:•|[-*])(?:\s+|$)(.*)$/;

export function parseNoshResponseBlocks(text: string): NoshResponseBlock[] {
  const blocks: NoshResponseBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({ kind: 'paragraph', text: paragraphLines.join(' ') });
    paragraphLines = [];
  };

  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const bullet = trimmed.match(BULLET_LINE);
    if (bullet) {
      flushParagraph();
      if (bullet[1]) blocks.push({ kind: 'bullet', text: bullet[1].trim() });
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph();
  return blocks;
}
