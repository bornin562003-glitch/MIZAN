import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ProfileData, ProfileMeta, Transaction, TransactionType } from '../types/finance';
import { getTodayIso } from './formatters';

function escapeCsvCell(val: string | number): string {
  const str = String(val ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

export function exportTransactionsToCsv(profile: ProfileMeta, data: ProfileData): string {
  const accountMap = new Map(data.accounts.map((a) => [a.id, a.name]));
  const envelopeMap = new Map(data.envelopes.map((e) => [e.id, e.name]));

  const headers = ['Date', 'Type', 'Merchant', 'Amount', 'Currency', 'Account', 'Envelopes', 'Tags', 'Notes'];
  const rows = data.transactions.map((tx) => {
    const envLabels = tx.splits
      .map((s) => `${envelopeMap.get(s.envelopeId) ?? 'Envelope'}: ${s.amount}`)
      .join(' | ');
    return [
      tx.date,
      tx.type,
      tx.merchant,
      tx.amount,
      profile.currency,
      accountMap.get(tx.accountId) ?? '',
      envLabels,
      tx.tags.join(', '),
      tx.notes ?? '',
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function parseImportedTransactionsCsv(
  rawText: string,
  data: ProfileData,
): { transactions: Omit<Transaction, 'id' | 'createdAt'>[]; error: string | null } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { transactions: [], error: 'CSV file appears empty or missing data rows.' };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const dateIdx = headers.findIndex((h) => h.includes('date'));
  const typeIdx = headers.findIndex((h) => h.includes('type'));
  const merchantIdx = headers.findIndex((h) => h.includes('merchant') || h.includes('desc') || h.includes('item'));
  const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('price') || h.includes('total'));
  const accountIdx = headers.findIndex((h) => h.includes('account'));
  const envIdx = headers.findIndex((h) => h.includes('envelope') || h.includes('category'));
  const tagsIdx = headers.findIndex((h) => h.includes('tag'));
  const notesIdx = headers.findIndex((h) => h.includes('note'));

  if (amountIdx === -1 || merchantIdx === -1) {
    return { transactions: [], error: 'CSV must include at least Merchant/Description and Amount columns.' };
  }

  const fallbackAccountId = data.accounts[0]?.id ?? '';
  const fallbackEnvelopeId = data.envelopes[0]?.id ?? '';
  const accountByName = new Map(data.accounts.map((a) => [a.name.toLowerCase(), a.id]));
  const envelopeByName = new Map(data.envelopes.map((e) => [e.name.toLowerCase(), e.id]));

  const parsed: Omit<Transaction, 'id' | 'createdAt'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const rawAmount = Number(String(cols[amountIdx] ?? '').replace(/[^0-9.-]/g, ''));
    const merchant = cols[merchantIdx] ?? '';
    if (!merchant || !Number.isFinite(rawAmount) || rawAmount <= 0) continue;

    const rawType = (typeIdx >= 0 ? cols[typeIdx] : 'spend').toLowerCase();
    const type: TransactionType =
      rawType === 'income' || rawType === 'transfer' || rawType === 'borrow' || rawType === 'lend'
        ? rawType
        : 'spend';

    const rawDate = dateIdx >= 0 ? cols[dateIdx] : getTodayIso();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : getTodayIso();

    const rawAccount = accountIdx >= 0 ? cols[accountIdx]?.toLowerCase() ?? '' : '';
    const accountId = accountByName.get(rawAccount) ?? fallbackAccountId;

    const rawEnvCell = envIdx >= 0 ? cols[envIdx] ?? '' : '';
    const firstEnvName = rawEnvCell.split(':')[0]?.trim().toLowerCase();
    const matchedEnvId = envelopeByName.get(firstEnvName) ?? fallbackEnvelopeId;

    const tags =
      tagsIdx >= 0 && cols[tagsIdx]
        ? cols[tagsIdx]
            .split(/[,\s]+/)
            .map((t) => t.replace(/^#/, '').trim().toLowerCase())
            .filter(Boolean)
        : ['csv-import'];

    parsed.push({
      type,
      amount: rawAmount,
      date,
      merchant,
      accountId,
      splits:
        type === 'spend' && matchedEnvId
          ? [{ id: `csv-sp-${i}-${Date.now()}`, envelopeId: matchedEnvId, amount: rawAmount }]
          : [],
      tags,
      notes: notesIdx >= 0 ? cols[notesIdx] || undefined : undefined,
    });
  }

  if (parsed.length === 0) {
    return { transactions: [], error: 'No valid positive rows found in CSV file.' };
  }

  return { transactions: parsed, error: null };
}

export function triggerFileDownload(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function validateImportedProfileJson(rawText: string): { data: ProfileData | null; error: string | null } {
  try {
    const parsed = JSON.parse(rawText) as Partial<ProfileData>;
    if (
      !parsed ||
      !Array.isArray(parsed.accounts) ||
      !Array.isArray(parsed.envelopes) ||
      !Array.isArray(parsed.transactions)
    ) {
      return { data: null, error: 'Invalid Mizan backup file: missing accounts, envelopes, or transactions.' };
    }
    return {
      data: {
        profileId: typeof parsed.profileId === 'string' ? parsed.profileId : 'restored',
        monthlyIncomeTarget: Number(parsed.monthlyIncomeTarget) || 0,
        monthlySavingsGoal: Number(parsed.monthlySavingsGoal) || 0,
        accounts: parsed.accounts,
        envelopes: parsed.envelopes,
        transactions: parsed.transactions,
        reflections: parsed.reflections && typeof parsed.reflections === 'object' ? parsed.reflections : {},
        sectionLabels: parsed.sectionLabels && typeof parsed.sectionLabels === 'object' ? parsed.sectionLabels : undefined,
        quickPresets: Array.isArray(parsed.quickPresets) ? parsed.quickPresets : undefined,
        loans: Array.isArray(parsed.loans) ? parsed.loans : undefined,
        paydayTemplates: Array.isArray(parsed.paydayTemplates) ? parsed.paydayTemplates : undefined,
        recurringTransactions: Array.isArray(parsed.recurringTransactions)
          ? parsed.recurringTransactions
          : undefined,
        debts: Array.isArray(parsed.debts) ? parsed.debts : undefined,
        commuteTracker: parsed.commuteTracker,
        sideProject: parsed.sideProject,
        preferences: parsed.preferences,
      },
      error: null,
    };
  } catch {
    return { data: null, error: 'File is not valid JSON.' };
  }
}

export async function generateStatementPdf(element: HTMLElement, fileName: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 1.5,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc) => {
      clonedDoc.documentElement.className = '';
      clonedDoc.body.style.backgroundColor = '#ffffff';
      clonedDoc.body.style.color = '#0f172a';
      clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        node.remove();
      });
    },
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  const renderedHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = renderedHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, renderedHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - renderedHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, renderedHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  pdf.save(fileName);
}
