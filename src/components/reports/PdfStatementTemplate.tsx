import React from 'react';
import { ProfileData, ProfileMeta } from '../../types/finance';
import { BudgetMetrics } from '../../utils/budgetEngine';
import { formatCurrency } from '../../utils/formatters';
import { buildMonthlyReportData, MonthlyReportData } from '../../utils/reportHelpers';

interface PdfStatementTemplateProps {
  statementRef?: React.RefObject<HTMLDivElement | null>;
  profile: ProfileMeta;
  data: ProfileData;
  metrics: BudgetMetrics;
  monthLabel?: string;
  reportData?: MonthlyReportData;
  includeCharts?: boolean;
  includeAccounts?: boolean;
  includeLedger?: boolean;
  inlinePreview?: boolean;
}

export const PdfStatementTemplate: React.FC<PdfStatementTemplateProps> = ({
  statementRef,
  profile,
  data,
  metrics,
  monthLabel,
  reportData,
  includeCharts = true,
  includeAccounts = true,
  includeLedger = true,
  inlinePreview = false,
}) => {
  const resolvedReport =
    reportData ?? buildMonthlyReportData(data, new Date().toISOString().slice(0, 7));
  const resolvedLabel = monthLabel ?? resolvedReport.monthLabel;

  const accountMap = new Map(data.accounts.map((a) => [a.id, a.name]));
  const envelopeMap = new Map(data.envelopes.map((e) => [e.id, e.name]));

  const totalMonthEnvelopeSpend = resolvedReport.envelopeLines.reduce(
    (acc, line) => acc + line.spentInMonth,
    0,
  );
  const palette = ['#0d9488', '#2563eb', '#d97706', '#7c3aed', '#e11d48', '#475569'];
  const chartRows = resolvedReport.envelopeLines.filter((s) => s.spentInMonth > 0).slice(0, 6);

  const sheet = (
    <div
      ref={statementRef}
      data-pdf-statement="true"
      style={{
        width: '794px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '38px 40px',
        boxSizing: 'border-box',
      }}
    >
      {/* Statement Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #0f766e',
          paddingBottom: '18px',
          marginBottom: '22px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#0f766e',
            }}
          >
            Mizan Monthly Financial Report
          </div>
          <h1 style={{ margin: '6px 0 4px', fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            {profile.name} Statement
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            Period: {resolvedLabel} · Currency: {profile.currency} · {resolvedReport.transactions.length} entries
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            Issued {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </div>
          <div style={{ marginTop: '4px', fontWeight: 600, color: '#0f766e' }}>
            Budget Health: {metrics.budgetHealthScore}/100 ({metrics.healthStatus})
          </div>
          <div style={{ marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
            Safe Daily Pace: {formatCurrency(metrics.safeDailyPace, profile.currency)}
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {[
          { label: 'Net Worth', value: formatCurrency(metrics.netWorth, profile.currency), color: '#0f172a' },
          {
            label: 'Period Inflow',
            value: `+${formatCurrency(resolvedReport.monthlyInflow, profile.currency)}`,
            color: '#047857',
          },
          {
            label: 'Period Outflow',
            value: `-${formatCurrency(resolvedReport.monthlyOutflow, profile.currency)}`,
            color: '#be123c',
          },
          {
            label: 'Net Cash Flow',
            value: `${resolvedReport.netCashFlow >= 0 ? '+' : '-'}${formatCurrency(
              Math.abs(resolvedReport.netCashFlow),
              profile.currency,
            )}`,
            color: resolvedReport.netCashFlow >= 0 ? '#047857' : '#be123c',
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b' }}>{card.label}</div>
            <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: 700, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Category Spend Allocation Bar Chart (Pure Inline SVG for html2canvas safety) */}
      {includeCharts && chartRows.length > 0 && totalMonthEnvelopeSpend > 0 && (
        <div
          style={{
            marginBottom: '24px',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
            Monthly Spending Distribution
          </div>
          {(() => {
            let cursor = 0;
            return (
              <svg
                width="680"
                height="16"
                viewBox="0 0 680 16"
                style={{ display: 'block', borderRadius: '6px', overflow: 'hidden' }}
              >
                {chartRows.map((item, idx) => {
                  const width = Math.max(4, Math.round((item.spentInMonth / totalMonthEnvelopeSpend) * 680));
                  const x = cursor;
                  cursor += width;
                  return (
                    <rect
                      key={item.envelope.id}
                      x={x}
                      y={0}
                      width={width}
                      height={16}
                      fill={palette[idx % palette.length]}
                    />
                  );
                })}
              </svg>
            );
          })()}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '10px',
              fontSize: '11px',
              color: '#475569',
            }}
          >
            {chartRows.map((item, idx) => {
              const pct = Math.round((item.spentInMonth / totalMonthEnvelopeSpend) * 100);
              return (
                <div key={item.envelope.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '2px',
                      backgroundColor: palette[idx % palette.length],
                    }}
                  />
                  <span>
                    {item.envelope.name}: {pct}% ({formatCurrency(item.spentInMonth, profile.currency)})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Envelope Allocation Table */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
          Envelope Allocation Summary
        </h2>
        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', textAlign: 'left' }}>
              <th style={{ padding: '8px 4px', fontWeight: 600 }}>Envelope</th>
              <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Assigned</th>
              <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Spent</th>
              <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Used</th>
              <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {resolvedReport.envelopeLines.map((item) => (
              <tr key={item.envelope.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 4px', fontWeight: 500, color: '#1e293b' }}>
                  {item.envelope.name}
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#334155' }}>
                  {formatCurrency(item.envelope.assigned, profile.currency)}
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#334155' }}>
                  {formatCurrency(item.spentInMonth, profile.currency)}
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: '#64748b' }}>
                  {item.utilizationPct}%
                </td>
                <td
                  style={{
                    padding: '8px 4px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: item.isOverspent ? '#be123c' : '#047857',
                  }}
                >
                  {formatCurrency(item.remaining, profile.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Account Snapshot */}
      {includeAccounts && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            Account Balances Snapshot
          </h2>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '7px 4px', fontWeight: 600 }}>Account</th>
                <th style={{ padding: '7px 4px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '7px 4px', fontWeight: 600, textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((acc) => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '7px 4px', fontWeight: 500, color: '#1e293b' }}>{acc.name}</td>
                  <td style={{ padding: '7px 4px', color: '#64748b', textTransform: 'capitalize' }}>
                    {acc.kind}
                  </td>
                  <td
                    style={{
                      padding: '7px 4px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: acc.balance < 0 ? '#be123c' : '#0f172a',
                    }}
                  >
                    {formatCurrency(acc.balance, profile.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Ledger */}
      {includeLedger && (
        <div>
          <h2 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            Chronological Ledger ({resolvedLabel})
          </h2>
          {resolvedReport.transactions.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0' }}>
              No transactions recorded for {resolvedLabel}.
            </p>
          ) : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Account</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {resolvedReport.transactions.slice(0, 45).map((tx) => {
                  const isInflow = tx.type === 'income' || tx.type === 'borrow';
                  const cat =
                    tx.splits.length > 0
                      ? tx.splits.map((s) => envelopeMap.get(s.envelopeId) ?? 'Envelope').join(', ')
                      : tx.type;
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '7px 4px', color: '#64748b' }}>{tx.date}</td>
                      <td style={{ padding: '7px 4px', fontWeight: 500, color: '#1e293b' }}>{tx.merchant}</td>
                      <td style={{ padding: '7px 4px', color: '#475569' }}>{accountMap.get(tx.accountId) ?? '-'}</td>
                      <td style={{ padding: '7px 4px', color: '#475569', textTransform: 'capitalize' }}>{cat}</td>
                      <td
                        style={{
                          padding: '7px 4px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: isInflow ? '#047857' : '#0f172a',
                        }}
                      >
                        {isInflow ? '+' : '-'}
                        {formatCurrency(tx.amount, profile.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  if (inlinePreview) {
    return sheet;
  }

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}
    >
      {sheet}
    </div>
  );
};
