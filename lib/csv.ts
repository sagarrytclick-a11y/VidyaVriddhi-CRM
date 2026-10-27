import { MAX_IMPORT_ROWS, normalizeLeadSource } from "@/lib/constants";
import { normalizePhoneNumber } from "@/lib/utils";

export interface ParsedLeadRow {
  businessName: string;
  phoneNumber: string;
  cityState?: string;
  category?: string;
  source?: string;
}

export interface ParseLeadResult {
  rows: ParsedLeadRow[];
  skipped: number;
  truncated: boolean;
}

type Delimiter = "," | "\t" | "|" | ";";

function detectDelimiter(line: string): Delimiter {
  const candidates: Delimiter[] = [",", "\t", "|", ";"];
  let best: Delimiter = ",";
  let bestCount = 0;

  for (const candidate of candidates) {
    const count = line.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function parseDelimitedLine(line: string, delimiter: Delimiter): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function clean(value: string | undefined): string {
  return (value ?? "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function looksLikeHeader(cells: string[]): {
  isHeader: boolean;
  nameIndex: number;
  phoneIndex: number;
  cityIndex: number;
  categoryIndex: number;
  sourceIndex: number;
} {
  const normalized = cells.map((cell) => cell.toLowerCase());
  const nameIndex = normalized.findIndex((cell) =>
    /business|company|brand|firm|name/.test(cell),
  );
  const phoneIndex = normalized.findIndex((cell) =>
    /phone|mobile|contact|number|whatsapp/.test(cell),
  );
  const cityIndex = normalized.findIndex((cell) =>
    /city|state|location|address|area/.test(cell),
  );
  const categoryIndex = normalized.findIndex((cell) =>
    /categor|segment|industry|vertical|business\s*type|lead\s*type/.test(cell),
  );
  const sourceIndex = normalized.findIndex((cell) =>
    /source|channel|platform|campaign|lead\s*from|coming\s*from/.test(cell),
  );

  return {
    isHeader: nameIndex >= 0 && phoneIndex >= 0,
    nameIndex,
    phoneIndex,
    cityIndex,
    categoryIndex,
    sourceIndex,
  };
}

function extractFromLooseLine(line: string): ParsedLeadRow | null {
  const phoneMatch = line.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/,
  );

  if (!phoneMatch) return null;

  const phone = normalizePhoneNumber(phoneMatch[0]);
  if (!isPhone(phone)) return null;

  const businessName = clean(line.replace(phoneMatch[0], "").replace(/[,|;\t-]+$/, ""));
  if (!businessName) return null;

  return { businessName, phoneNumber: phone };
}

export function parseLeadText(input: string): ParseLeadResult {
  const lines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], skipped: 0, truncated: false };
  }

  const firstDelimiter = detectDelimiter(lines[0]);
  const firstCells = parseDelimitedLine(lines[0], firstDelimiter);
  const header = looksLikeHeader(firstCells);

  let nameIndex = header.isHeader ? header.nameIndex : 0;
  let phoneIndex = header.isHeader ? header.phoneIndex : 1;
  const cityIndex = header.isHeader
    ? header.cityIndex
    : firstCells.length > 2
      ? 2
      : -1;
  const categoryIndex = header.isHeader
    ? header.categoryIndex
    : firstCells.length > 3
      ? 3
      : -1;
  const sourceIndex = header.isHeader
    ? header.sourceIndex
    : firstCells.length > 4
      ? 4
      : -1;

  if (!header.isHeader && firstCells.length < 2) {
    nameIndex = -1;
    phoneIndex = -1;
  }

  const rows: ParsedLeadRow[] = [];
  let skipped = 0;
  let truncated = false;
  const startIndex = header.isHeader ? 1 : 0;

  for (let index = startIndex; index < lines.length; index += 1) {
    if (rows.length >= MAX_IMPORT_ROWS) {
      truncated = true;
      break;
    }

    const line = lines[index];
    const cells = parseDelimitedLine(line, detectDelimiter(line));

    let businessName = clean(cells[nameIndex]);
    let rawPhone = clean(cells[phoneIndex]);
    let cityState = cityIndex >= 0 ? clean(cells[cityIndex]) : "";
    let category = categoryIndex >= 0 ? clean(cells[categoryIndex]) : "";
    let source = sourceIndex >= 0 ? clean(cells[sourceIndex]) : "";

    if (!businessName || !rawPhone || !isPhone(rawPhone)) {
      const loose = extractFromLooseLine(line);
      if (!loose) {
        skipped += 1;
        continue;
      }
      businessName = loose.businessName;
      rawPhone = loose.phoneNumber;
      cityState = "";
      category = "";
      source = "";
    }

    const phoneNumber = normalizePhoneNumber(rawPhone);
    const normalizedSource = normalizeLeadSource(source);

    if (!businessName || !isPhone(phoneNumber)) {
      skipped += 1;
      continue;
    }

    rows.push({
      businessName: businessName.slice(0, 200),
      phoneNumber,
      ...(cityState ? { cityState: cityState.slice(0, 200) } : {}),
      ...(category ? { category: category.slice(0, 100) } : {}),
      ...(normalizedSource ? { source: normalizedSource } : {}),
    });
  }

  return { rows, skipped, truncated };
}
