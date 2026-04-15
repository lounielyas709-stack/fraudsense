'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Play, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const RISK_COLORS: Record<string, string> = {
  critique: '#f87171',
  élevé: '#fb923c',
  moyen: '#fbbf24',
  faible: '#4ade80',
};

const DEFAULT_TX = {
  V1: -1.36, V2: -0.07, V3: 2.53, V4: 1.38, V5: -0.34,
  V6: 0.46, V7: 0.24, V8: 0.10, V9: 0.36, V10: 0.09,
  V11: -0.55, V12: -0.62, V13: -0.99, V14: -0.31, V15: 1.47,
  V16: -0.47, V17: 0.21, V18: 0.03, V19: 0.40, V20: 0.25,
  V21: -0.02, V22: 0.28, V23: -0.11, V24: 0.07, V25: 0.13,
  V26: -0.19, V27: 0.13, V28: -0.02, Amount: 149.62
};

const FRAUD_TX = {
  V1: -2.31, V2: 1.95, V3: -1.61, V4: 3.99, V5: -0.52,
  V6: -1.43, V7: -2.77, V8: -2.77, V9: -0.38, V10: -1.19,
  V11: 1.94, V12: -1.17, V13: 0.65, V14: -6.05, V15: -0.27,
  V16: -2.89, V17: -8.23, V18: -0.17, V19: 0.35, V20: -0.02,
  V21: -0.01, V22: -0.06, V23: -0.06, V24: -0.17, V25: 0.05,
  V26: -0.18, V27: 0.07, V28: -0.05, Amount: 239.93
};

interface SimResult {
  fraud_probability: number;
  label: string;
  risk_level: string;
  risk_factors: string[];
  amount: number;
}

export default function SimulatePage() {
  const [tx, setTx] = useState(DEFAULT_TX);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.5);

  // Persist threshold in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('fraudsense_threshold');
    if (stored) setThreshold(parseFloat(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('fraudsense_threshold', threshold.toString());
    setResult(null); // reset result when threshold changes
  }, [threshold]);

  const handleSimulate = async () => {
    setLoading(true);
    setSimError(null);
    try {
      const res = await axios.post(`${API}/simulate?threshold=${threshold}`, tx, { timeout: 60000 });
      setResult(res.data);
    } catch {
      setSimError('Erreur lors de la simulation — réessayez dans quelques secondes.');
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset: typeof DEFAULT_TX) => {
    setTx(preset);
    setResult(null);
  };

  const updateField = (key: string, val: string) => {
    setTx(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
    setResult(null);
  };

  const color = result ? RISK_COLORS[result.risk_level] || '#71717a' : 'var(--cyan)';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
          <ArrowLeft size={14} /> Retour au dashboard
        </Link>
        <div style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
          Simulation
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Et si ?</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 13 }}>
          Modifiez les paramètres d'une transaction et observez l'impact sur le score de fraude en temps réel.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Left — Inputs */}
        <div>
          {/* Presets */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button onClick={() => loadPreset(DEFAULT_TX)} style={{
              flex: 1, padding: '8px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500
            }}>
              Transaction normale
            </button>
            <button onClick={() => loadPreset(FRAUD_TX)} style={{
              flex: 1, padding: '8px', background: '#f8717111',
              border: '1px solid #f8717130', borderRadius: 6,
              color: '#f87171', fontSize: 12, fontWeight: 500
            }}>
              Transaction suspecte
            </button>
          </div>

          {/* Amount slider */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Montant (€)</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{tx.Amount.toFixed(2)}€</span>
            </div>
            <input type="range" min="0" max="5000" step="10"
              value={tx.Amount}
              onChange={e => updateField('Amount', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--cyan)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>0€</span><span>5000€</span>
            </div>
          </div>

          {/* Top features sliders */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              Features clés
            </div>
            {["V17", "V14", "V12", "V10"].map(feat => {
              // Ces 4 features : négatif extrême = fraude, positif extrême = anti-fraude
              const val = (tx as any)[feat];
              const sliderColor = val < -2 ? '#f87171' : val > 2 ? '#4ade80' : 'var(--cyan)';
              const labelColor  = val < -2 ? '#f87171' : val > 2 ? '#4ade80' : 'var(--text-primary)';
              return (
                <div key={feat} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{feat}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: labelColor }}>
                      {val.toFixed(2)}
                    </span>
                  </div>
                  <input type="range" min="-15" max="15" step="0.1"
                    value={val}
                    onChange={e => updateField(feat, e.target.value)}
                    style={{ width: '100%', accentColor: sliderColor }}
                  />
                </div>
              );
            })}
          </div>

          {/* Threshold slider */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Seuil de détection</span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Au-dessus → classé fraude
                </div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--cyan)' }}>
                {Math.round(threshold * 100)}%
              </span>
            </div>
            <input type="range" min="0.1" max="0.9" step="0.05"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cyan)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>10% (sensible)</span><span>90% (strict)</span>
            </div>
          </div>

          {/* Simulate button */}
          <button onClick={handleSimulate} disabled={loading} style={{
            width: '100%', padding: '14px',
            background: 'var(--cyan)', color: '#000',
            border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            {loading ? 'Calcul...' : 'Simuler'}
          </button>
        </div>

        {/* Right — Result */}
        <div>
          {simError ? (
            <div style={{
              background: '#f8717111', border: '1px solid #f8717130',
              borderRadius: 12, padding: 24, textAlign: 'center'
            }}>
              <div style={{ color: '#f87171', fontWeight: 600, marginBottom: 8 }}>Erreur</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{simError}</div>
            </div>
          ) : !result ? (
            <div style={{
              height: '100%', minHeight: 300,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexDirection: 'column', gap: 8
            }}>
              <Play size={24} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Lance une simulation</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Score */}
              <div style={{
                background: 'var(--bg-card)', border: `1px solid ${color}30`,
                borderRadius: 12, padding: 28, textAlign: 'center'
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Score de fraude
                </div>
                <div style={{ fontSize: 56, fontWeight: 700, color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {(result.fraud_probability * 100).toFixed(1)}%
                </div>
                {/* Threshold marker on bar */}
                <div style={{ marginTop: 16, position: 'relative', height: 8, background: 'var(--border)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${result.fraud_probability * 100}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  <div style={{
                    position: 'absolute', top: -4, left: `${threshold * 100}%`,
                    width: 2, height: 16, background: 'var(--text-muted)',
                    transform: 'translateX(-50%)',
                  }} />
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-muted)', textAlign: 'left', paddingLeft: `${threshold * 100}%` }}>
                  seuil {Math.round(threshold * 100)}%
                </div>
                <div style={{ marginTop: 12 }}>
                  <span style={{
                    background: color + '18', color, border: `1px solid ${color}30`,
                    padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase'
                  }}>
                    {result.risk_level}
                  </span>
                </div>
              </div>

              {/* SHAP Factors */}
              {result.risk_factors.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Analyse SHAP
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Contributions des features à la décision
                  </div>
                  {result.risk_factors.map((f, i) => (
                    <div key={i} style={{
                      background: 'var(--bg)', borderLeft: '3px solid #f87171',
                      borderRadius: 6, padding: '10px 14px',
                      fontSize: 13, marginBottom: 8, color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                    }}>
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {/* Normal result */}
              {result.label === 'normal' && (
                <div style={{
                  background: '#4ade8011', border: '1px solid #4ade8030',
                  borderRadius: 12, padding: 20, textAlign: 'center'
                }}>
                  <div style={{ color: '#4ade80', fontWeight: 600, marginBottom: 4 }}>Transaction normale</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Aucun comportement suspect détecté</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
