'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { ArrowLeft, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const RISK_COLORS: Record<string, string> = {
  critique: '#f87171',
  élevé: '#fb923c',
  moyen: '#fbbf24',
  faible: '#4ade80',
};

interface Fraud {
  id: number;
  transaction_id: number;
  fraud_probability: number;
  risk_level: string;
  risk_factors: string;
  created_at: string | null;
}

interface FraudsResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  frauds: Fraud[];
}

function RiskBadge({ level }: { level: string }) {
  const color = RISK_COLORS[level] || '#71717a';
  return (
    <span style={{
      background: color + '18', color,
      border: `1px solid ${color}30`,
      padding: '2px 10px', borderRadius: 4,
      fontSize: 11, fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    }}>{level}</span>
  );
}

export default function FraudsPage() {
  const [data, setData] = useState<FraudsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFrauds = useCallback((p: number) => {
    setLoading(true);
    setError(null);
    axios.get(`${API}/frauds`, { params: { page: p, limit: 50 }, timeout: 15000 })
      .then(res => { setData(res.data); })
      .catch(() => { setError("Impossible de charger les fraudes."); })
      .finally(() => { setLoading(false); });
  }, []);

  useEffect(() => { fetchFrauds(page); }, [page, fetchFrauds]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
          <ArrowLeft size={14} /> Retour au dashboard
        </Link>
        <div style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
          Toutes les fraudes
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Transactions frauduleuses
          {data && <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 12 }}>— {data.total} au total</span>}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#f8717111', border: '1px solid #f8717130',
          borderRadius: 10, padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={16} color="#f87171" />
          <span style={{ color: '#f87171', fontSize: 13 }}>{error}</span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            Chargement...
          </div>
        ) : data && data.frauds.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Aucune fraude détectée — importez un fichier CSV pour commencer.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                color: 'var(--text-muted)', fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                borderBottom: '1px solid var(--border)',
              }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 500 }}>Transaction</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 500 }}>Score</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 500 }}>Niveau</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 500 }}>Facteurs de risque</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: 500 }}>Détecté le</th>
              </tr>
            </thead>
            <tbody>
              {data!.frauds.map((f) => (
                <tr key={f.id}
                  style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 13 }}>
                    #{f.transaction_id}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: RISK_COLORS[f.risk_level] || '#f87171', fontSize: 15 }}>
                    {(f.fraud_probability * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <RiskBadge level={f.risk_level} />
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: 12, maxWidth: 400 }}>
                    {f.risk_factors || '—'}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {f.created_at ? new Date(f.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 6,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} /> Précédent
          </button>

          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Page {data.page} / {data.pages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 6,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: page === data.pages ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: 13, cursor: page === data.pages ? 'not-allowed' : 'pointer',
            }}
          >
            Suivant <ChevronRight size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
