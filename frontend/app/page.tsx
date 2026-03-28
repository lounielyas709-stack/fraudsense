'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { AlertTriangle, ShieldCheck, Activity, TrendingUp, Upload, Zap, ChevronRight } from 'lucide-react';

const API = 'http://localhost:8000';

interface Fraud {
  transaction_id: number;
  fraud_probability: number;
  risk_level: string;
  risk_factors: string;
}

interface Analytics {
  total_transactions: number;
  total_fraud: number;
  total_normal: number;
  fraud_rate: number;
  top_frauds: Fraud[];
}

const RISK_COLORS: Record<string, string> = {
  critique: '#f87171',
  élevé: '#fb923c',
  moyen: '#fbbf24',
  faible: '#4ade80',
};

function RiskBadge({ level }: { level: string }) {
  const color = RISK_COLORS[level] || '#71717a';
  return (
    <span style={{
      background: color + '18',
      color,
      border: `1px solid ${color}30`,
      padding: '2px 10px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    }}>{level}</span>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '24px 28px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
        <span style={{ color: accent, opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ height: 2, background: accent + '22', borderRadius: 2 }}>
        <div style={{ height: '100%', width: '60%', background: accent, borderRadius: 2, opacity: 0.6 }} />
      </div>
    </div>
  );
}

function FraudModal({ fraud, onClose }: { fraud: Fraud; onClose: () => void }) {
  const factors = fraud.risk_factors ? fraud.risk_factors.split(', ') : [];
  const color = RISK_COLORS[fraud.risk_level] || '#71717a';
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 36, width: 480, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Transaction</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>#{fraud.transaction_id}</div>
          </div>
          <RiskBadge level={fraud.risk_level} />
        </div>

        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Score de fraude</div>
          <div style={{ fontSize: 42, fontWeight: 700, color, letterSpacing: '-0.02em' }}>
            {(fraud.fraud_probability * 100).toFixed(1)}%
          </div>
          <div style={{ marginTop: 12, height: 6, background: 'var(--border)', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${fraud.fraud_probability * 100}%`, background: color, borderRadius: 3 }} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Facteurs de risque détectés</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {factors.map((f, i) => (
              <div key={i} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderLeft: '3px solid #f87171', borderRadius: 6,
                padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)'
              }}>
                {f}
              </div>
            ))}
          </div>
        </div>

        <button onClick={onClose} style={{
          marginTop: 28, width: '100%', padding: '12px',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13,
          cursor: 'pointer',
        }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Fraud | null>(null);

  useEffect(() => {
    axios.get(`${API}/analytics`).then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
      Chargement des données...
    </div>
  );

  const barData = [
    { name: 'Normales', value: data!.total_normal, color: '#4ade80' },
    { name: 'Fraudes', value: data!.total_fraud, color: '#f87171' },
  ];

  const pieData = [
    { name: 'Normal', value: data!.total_normal, color: '#4ade80' },
    { name: 'Fraude', value: data!.total_fraud, color: '#f87171' },
  ];

  return (
    <>
      {selected && <FraudModal fraud={selected} onClose={() => setSelected(null)} />}

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
              Fraud Intelligence Platform
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>FraudSense</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>
              Détection et analyse de fraude — Assurance / Mutuelle
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href="/simulate" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              padding: '10px 20px', borderRadius: 8,
              fontSize: 13, fontWeight: 600,
            }}>
              <Zap size={14} /> Simulation
            </a>
            <a href="/upload" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--cyan)', color: '#000',
              padding: '10px 20px', borderRadius: 8,
              fontSize: 13, fontWeight: 600,
            }}>
              <Upload size={14} /> Importer un fichier
            </a>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Transactions analysées" value={data!.total_transactions.toLocaleString('fr-FR')} icon={<Activity size={16} />} accent="var(--cyan)" />
          <StatCard label="Fraudes détectées" value={data!.total_fraud.toLocaleString('fr-FR')} icon={<AlertTriangle size={16} />} accent="#f87171" />
          <StatCard label="Transactions normales" value={data!.total_normal.toLocaleString('fr-FR')} icon={<ShieldCheck size={16} />} accent="#4ade80" />
          <StatCard label="Taux de fraude" value={`${data!.fraud_rate}%`} icon={<TrendingUp size={16} />} accent="#fbbf24" />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barSize={48}>
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'var(--bg-hover)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Répartition</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Fraudes Table */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
            Transactions suspectes — Top {data!.top_frauds.length}
          </div>
          {data!.top_frauds.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune fraude détectée — importez un fichier pour commencer.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <th style={{ textAlign: 'left', paddingBottom: 14, fontWeight: 500 }}>ID</th>
                  <th style={{ textAlign: 'left', paddingBottom: 14, fontWeight: 500 }}>Score</th>
                  <th style={{ textAlign: 'left', paddingBottom: 14, fontWeight: 500 }}>Niveau</th>
                  <th style={{ textAlign: 'left', paddingBottom: 14, fontWeight: 500 }}>Facteurs principaux</th>
                  <th style={{ textAlign: 'right', paddingBottom: 14, fontWeight: 500 }}></th>
                </tr>
              </thead>
              <tbody>
                {data!.top_frauds.map((f, i) => (
                  <tr key={i}
                    onClick={() => setSelected(f)}
                    style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 0', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>#{f.transaction_id}</td>
                    <td style={{ padding: '14px 0', fontWeight: 700, color: '#f87171', fontSize: 15 }}>{(f.fraud_probability * 100).toFixed(1)}%</td>
                    <td style={{ padding: '14px 0' }}><RiskBadge level={f.risk_level} /></td>
                    <td style={{ padding: '14px 0', color: 'var(--text-secondary)', fontSize: 12, maxWidth: 400 }}>{f.risk_factors}</td>
                    <td style={{ padding: '14px 0', textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </>
  );
}