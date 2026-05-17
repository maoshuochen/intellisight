type ImportedParagraph = {
  speaker?: string;
  startTime?: string;
  text: string;
};

const linePattern = /^(?:(?<speaker>[A-Za-z][\w .'-]{0,48})\s*)?(?:\[?(?<time>\d{1,2}:\d{2}(?::\d{2})?)\]?)?\s*[:\-–]\s*(?<text>.+)$/;

export function parseTranscript(input: string): ImportedParagraph[] {
  const paragraphs: ImportedParagraph[] = [];
  let current: ImportedParagraph | null = null;

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      current = null;
      continue;
    }

    const match = line.match(linePattern);
    const groups = match?.groups as { speaker?: string; time?: string; text?: string } | undefined;
    if (groups?.text && (groups.speaker || groups.time)) {
      current = {
        speaker: groups.speaker?.trim(),
        startTime: groups.time,
        text: groups.text.trim()
      };
      paragraphs.push(current);
      continue;
    }

    if (current) {
      current.text = `${current.text} ${line}`;
    } else {
      current = { text: line };
      paragraphs.push(current);
    }
  }

  return paragraphs.filter((paragraph) => paragraph.text.trim().length > 0);
}
