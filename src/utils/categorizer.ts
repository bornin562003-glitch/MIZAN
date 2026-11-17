import { Envelope, ProfileData, TransactionSplit } from '../types/finance';
import { getMonthPrefix } from './budgetEngine';

interface KeywordRule {
  keywords: string[];
  envelopeHints: string[];
  suggestedTags: string[];
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: ['shell', 'pso', 'total', 'caltex', 'petrol', 'diesel', 'fuel', 'uber', 'careem', 'indrive', 'metro bus', 'toll'],
    envelopeHints: ['fuel', 'commute', 'travel'],
    suggestedTags: ['commute', 'fuel'],
  },
  {
    keywords: ['al-fatah', 'alfatah', 'imtiaz', 'metro', 'mart', 'grocery', 'supermarket', 'chai', 'coffee', 'roastery', 'bakery', 'restaurant', 'cafe', 'dinner', 'lunch', 'foodpanda', 'biryani', 'pizza'],
    envelopeHints: ['food', 'grocer', 'dining', 'meal'],
    suggestedTags: ['dining', 'essential'],
  },
  {
    keywords: ['iesco', 'lesco', 'kelectric', 'sui', 'gas', 'nayatel', 'ptcl', 'stormfiber', 'electric', 'water', 'internet', 'bill'],
    envelopeHints: ['utilit', 'bill', 'fixed', 'cloud'],
    suggestedTags: ['essential', 'bills'],
  },
  {
    keywords: ['rent', 'landlord', 'maintenance', 'society', 'school', 'tuition', 'fee'],
    envelopeHints: ['rent', 'school', 'tuition', 'fixed'],
    suggestedTags: ['essential', 'housing'],
  },
  {
    keywords: ['pharmacy', 'clinic', 'detergent', 'soap', 'tissue', 'household', 'hardware', 'chemist'],
    envelopeHints: ['household', 'care', 'health'],
    suggestedTags: ['essential'],
  },
  {
    keywords: ['aws', 'vercel', 'figma', 'github', 'cloud', 'saas', 'domain', 'software'],
    envelopeHints: ['cloud', 'saas', 'infra'],
    suggestedTags: ['work', 'infra'],
  },
  {
    keywords: ['saving', 'reserve', 'emergency', 'vault', 'tax'],
    envelopeHints: ['emergency', 'reserve', 'saving', 'vault', 'tax'],
    suggestedTags: ['savings'],
  },
];

export function suggestCategorization(
  merchantText: string,
  envelopes: Envelope[],
): { envelopeId: string | null; matchedRule: boolean; suggestedTags: string[] } {
  const normalized = merchantText.trim().toLowerCase();
  if (!normalized || envelopes.length === 0) {
    return { envelopeId: null, matchedRule: false, suggestedTags: [] };
  }

  for (const rule of KEYWORD_RULES) {
    const keywordHit = rule.keywords.some((kw) => normalized.includes(kw));
    if (!keywordHit) continue;

    const matchedEnv = envelopes.find((env) =>
      rule.envelopeHints.some((hint) => env.name.toLowerCase().includes(hint)),
    );

    if (matchedEnv) {
      return {
        envelopeId: matchedEnv.id,
        matchedRule: true,
        suggestedTags: rule.suggestedTags,
      };
    }
  }

  // Fallback: direct envelope name word match
  const directMatch = envelopes.find((env) =>
    env.name
      .toLowerCase()
      .split(/\s+/)
      .some((word) => word.length >= 3 && normalized.includes(word)),
  );

  if (directMatch) {
    return {
      envelopeId: directMatch.id,
      matchedRule: true,
      suggestedTags: [],
    };
  }

  return { envelopeId: null, matchedRule: false, suggestedTags: [] };
}

export function validateSplits(
  totalAmount: number,
  splits: TransactionSplit[],
): { valid: boolean; difference: number; error: string | null } {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return { valid: false, difference: totalAmount, error: 'Total amount must be greater than zero.' };
  }
  if (splits.length === 0) {
    return { valid: false, difference: totalAmount, error: 'Select at least one envelope.' };
  }

  for (const split of splits) {
    if (!split.envelopeId) {
      return { valid: false, difference: totalAmount, error: 'Every split row must choose an envelope.' };
    }
    if (!Number.isFinite(split.amount) || split.amount <= 0) {
      return { valid: false, difference: totalAmount, error: 'Every split amount must be greater than zero.' };
    }
  }

  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
  const diff = Math.round((totalAmount - sum) * 100) / 100;

  if (Math.abs(diff) > 0.01) {
    return {
      valid: false,
      difference: diff,
      error:
        diff > 0
          ? `${diff} remaining to allocate across splits.`
          : `Splits exceed total by ${Math.abs(diff)}.`,
    };
  }

  return { valid: true, difference: 0, error: null };
}

export interface HeatmapDay {
  day: number;
  dateIso: string;
  spend: number;
  target: number;
  status: 'none' | 'safe' | 'moderate' | 'high';
}

export function buildDailyHabitHeatmap(
  data: ProfileData,
  referenceDate: Date = new Date(),
): HeatmapDay[] {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthPrefix = getMonthPrefix(referenceDate);

  const dailyLivingEnvelopes = data.envelopes.filter((e) => e.group === 'daily_living');
  const dailyLivingIds = new Set(dailyLivingEnvelopes.map((e) => e.id));

  const configuredTarget = dailyLivingEnvelopes.reduce(
    (sum, e) => sum + (e.dailyHabitTarget ?? Math.round(e.assigned / daysInMonth)),
    0,
  );
  const dailyTarget = Math.max(500, configuredTarget);

  const spendByDay: Record<number, number> = {};
  for (const tx of data.transactions) {
    if (tx.type !== 'spend' || !tx.date.startsWith(monthPrefix)) continue;
    const day = Number(tx.date.slice(8, 10));
    if (!day) continue;
    const dailyPortion =
      tx.splits.length > 0
        ? tx.splits.filter((s) => dailyLivingIds.has(s.envelopeId)).reduce((s, x) => s + x.amount, 0)
        : tx.amount;
    if (dailyPortion > 0) {
      spendByDay[day] = (spendByDay[day] ?? 0) + dailyPortion;
    }
  }

  const result: HeatmapDay[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateIso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const spend = spendByDay[day] ?? 0;
    let status: HeatmapDay['status'] = 'none';
    if (spend > 0) {
      const ratio = spend / dailyTarget;
      if (ratio <= 0.85) status = 'safe';
      else if (ratio <= 1.2) status = 'moderate';
      else status = 'high';
    }
    result.push({ day, dateIso, spend, target: dailyTarget, status });
  }
  return result;
}

export interface ParsedOcrItem {
  id: string;
  description: string;
  amount: number;
  envelopeId: string;
  included: boolean;
}

export interface SimulatedOcrResult {
  merchant: string;
  date: string;
  confidence: number;
  sourceLabel: string;
  items: ParsedOcrItem[];
}

export function simulateOcrReceiptParse(
  fileName: string,
  envelopes: Envelope[],
  dateIso: string,
): SimulatedOcrResult {
  const lower = fileName.toLowerCase();
  const fallbackEnvId = envelopes[0]?.id ?? '';

  const pickEnv = (merchantOrDesc: string) =>
    suggestCategorization(merchantOrDesc, envelopes).envelopeId ?? fallbackEnvId;

  if (lower.includes('fuel') || lower.includes('shell') || lower.includes('pso')) {
    return {
      merchant: 'Shell Service Station',
      date: dateIso,
      confidence: 96,
      sourceLabel: fileName,
      items: [
        { id: 'ocr-1', description: 'Super Unleaded Fuel (18L)', amount: 4850, envelopeId: pickEnv('Shell fuel'), included: true },
        { id: 'ocr-2', description: 'Select Mart Water & Snacks', amount: 450, envelopeId: pickEnv('Mart snacks coffee'), included: true },
      ],
    };
  }

  if (lower.includes('diary') || lower.includes('handwritten') || lower.includes('note')) {
    return {
      merchant: 'Handwritten Daily Diary',
      date: dateIso,
      confidence: 91,
      sourceLabel: fileName,
      items: [
        { id: 'ocr-1', description: 'Morning Bakery & Milk', amount: 680, envelopeId: pickEnv('Bakery grocery'), included: true },
        { id: 'ocr-2', description: 'Ride Share to Office', amount: 520, envelopeId: pickEnv('Uber commute'), included: true },
        { id: 'ocr-3', description: 'Pharmacy Vitamins & Soap', amount: 1150, envelopeId: pickEnv('Pharmacy household'), included: true },
      ],
    };
  }

  return {
    merchant: 'Al-Fatah Supermarket',
    date: dateIso,
    confidence: 95,
    sourceLabel: fileName,
    items: [
      { id: 'ocr-1', description: 'Fresh Produce & Pantry Staples', amount: 2450, envelopeId: pickEnv('Supermarket grocery'), included: true },
      { id: 'ocr-2', description: 'Laundry Detergent & Cleaning', amount: 950, envelopeId: pickEnv('Detergent household'), included: true },
      { id: 'ocr-3', description: 'Espresso Beans & Biscuits', amount: 700, envelopeId: pickEnv('Coffee bakery'), included: true },
    ],
  };
}
