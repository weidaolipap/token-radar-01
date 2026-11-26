// Board summaries: the small print main.ts prints after a run, and the
// checks it makes on its own output before it calls the run finished.
//
// Nothing here touches a score. The board comes from lib/model.ts, already
// ranked; this file only reads it back and describes what it holds, so a
// summary can never change a ranking, a value or a farm plan.

import type { BoardRow, Snapshot } from './model.ts';

/** One line of the run summary: a rank, a name and an implied value. */
export interface TopRowLine {
  rank: number;
  name: string;
  slug: string;
  implied_value_usd: number;
}

/** The whole run, in numbers a person can read at a glance. */
export interface BoardSummaryText {
  total_rows: number;
  watchlist_covered: number;
  watchlist_size: number;
  early_rows: number;
  total_implied_usd: number;
  median_implied_usd: number;
  top: TopRowLine[];
}

/** The median of a sorted list of numbers, or 0 when the list is empty. */
function medianOf(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/** How much implied value the board carries in total, in whole dollars. */
export function totalImplied(board: BoardRow[]): number {
  let total = 0;
  for (const row of board) total += row.implied_value_usd;
  return total;
}

/** The board's top rows, strongest first, capped at `count`. */
export function topRows(board: BoardRow[], count = 10): TopRowLine[] {
  return board.slice(0, count).map((row) => ({
    rank: row.rank,
    name: row.name,
    slug: row.slug,
    implied_value_usd: row.implied_value_usd,
  }));
}

/**
 * The run summary: row counts, watchlist coverage, total and median implied
 * value, and the top ten. The board is already sorted by implied value, so
 * the median is read off the sorted values, not re-sorted by anything else.
 */
export function summarizeBoard(board: BoardRow[], snapshot: Snapshot): BoardSummaryText {
  const values = board.map((row) => row.implied_value_usd).sort((a, b) => a - b);
  const watchlist = new Set(snapshot.watchlist);
  let covered = 0;
  for (const row of board) if (watchlist.has(row.slug)) covered += 1;
  return {
    total_rows: board.length,
    watchlist_covered: covered,
    watchlist_size: snapshot.watchlist.length,
    early_rows: board.length - covered,
    total_implied_usd: totalImplied(board),
    median_implied_usd: medianOf(values),
    top: topRows(board),
  };
}

/** A short dollar figure: $675.7M, $402.4M, $1.2B, or the whole dollars. */
export function dollarsShort(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value}`;
}

/** How many board rows one category holds, and how much implied value. */
export interface CategoryCount {
  category: string;
  rows: number;
  implied_value_usd: number;
}

/**
 * The board broken down by category, most rows first, then most implied
 * value. A category nobody can name is listed as "(no category)", so the
 * breakdown always adds up to the board's row count.
 */
export function categoryBreakdown(board: BoardRow[]): CategoryCount[] {
  const byCategory = new Map<string, CategoryCount>();
  for (const row of board) {
    const name = row.category ?? '(no category)';
    const entry = byCategory.get(name);
    if (entry === undefined) {
      byCategory.set(name, { category: name, rows: 1, implied_value_usd: row.implied_value_usd });
    } else {
      entry.rows += 1;
      entry.implied_value_usd += row.implied_value_usd;
    }
  }
  return [...byCategory.values()].sort(
    (a, b) => b.rows - a.rows || b.implied_value_usd - a.implied_value_usd || (a.category < b.category ? -1 : 1),
  );
}

/** The summary as the lines main.ts prints, one per line, no trailing blank. */
export function summaryLines(summary: BoardSummaryText): string[] {
  const lines: string[] = [
    `token radar: ${summary.total_rows} rows, watchlist ${summary.watchlist_covered}/${summary.watchlist_size}, ${summary.early_rows} early rows`,
    `token radar: total implied value ${dollarsShort(summary.total_implied_usd)}, median ${dollarsShort(summary.median_implied_usd)}`,
  ];
  for (const row of summary.top) {
    lines.push(`token radar: #${row.rank} ${row.name} ${dollarsShort(row.implied_value_usd)}`);
  }
  return lines;
}

/** The category breakdown as the lines main.ts prints after the top ten. */
export function categoryLines(board: BoardRow[]): string[] {
  const breakdown = categoryBreakdown(board);
  const lines: string[] = [`token radar: ${breakdown.length} categories on the board`];
  for (const entry of breakdown.slice(0, 5)) {
    lines.push(`token radar: ${entry.category}: ${entry.rows} rows, ${dollarsShort(entry.implied_value_usd)}`);
  }
  return lines;
}

/**
 * Read a board back from disk and say why it is not the board that was
 * written, or null when it matches: same row count, same ranks in order,
 * same implied values in the same order. A mismatch means the output was
 * not written whole, and the run must not call itself finished.
 */
export function boardMatchesFile(board: BoardRow[], text: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return 'board.json is not JSON';
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return 'board.json is not a JSON object';
  const rows = (parsed as Record<string, unknown>).rows;
  if (!Array.isArray(rows)) return 'board.json has no rows array';
  if (rows.length !== board.length) return `board.json holds ${rows.length} rows, the board has ${board.length}`;
  for (let i = 0; i < board.length; i++) {
    const written = rows[i] as Record<string, unknown>;
    if (written.rank !== board[i]!.rank) return `board.json row ${i + 1} has rank ${String(written.rank)}`;
    if (written.slug !== board[i]!.slug) return `board.json row ${i + 1} is ${String(written.slug)}, expected ${board[i]!.slug}`;
    if (written.implied_value_usd !== board[i]!.implied_value_usd) {
      return `board.json row ${i + 1} has implied value ${String(written.implied_value_usd)}`;
    }
  }
  return null;
}
