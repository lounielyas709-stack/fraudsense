'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<{ message: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.5);

  // Sync threshold with localStorage (shared with simulate page)
  useEffect(() => {
    const stored = localStorage.getItem('fraudsense_threshold');
    if (stored) setThreshold(parseFloat(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('fraudsense_threshold', threshold.toString());
  }, [threshold]);

  const handleClearData = async () => {
    if (!confirm('Vider toute la base de données ? Cette action est irréversible.')) return;
    setClearing(true);
    setError(null);
    setResult(null);
    try {
      await axios.delete(`${API}/data`, { timeout: 15000 });
      setResult({ message: 'Base de données vidée avec succès.', total: 0 });
    } catch {
      setError('Erreur lors de la suppression des données.');
    } finally {
      setClearing(false);
    }
  };

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      setError('Format invalide — fichier CSV requis');
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/upload?threshold=${threshold}`, form, { timeout: 60000 });
      setResult(res.data);
      setFile(null);
    } catch {
      setError('Erreur lors de l\'import — vérifiez le format du fichier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
          <ArrowLeft size={14} /> Retour au dashboard
        </Link>
        <div style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
          Import de données
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Importer un fichier</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 13 }}>
          Uploadez un fichier CSV de transactions — chaque ligne sera analysée et scorée automatiquement.
        </p>
      </div>

      {/* Success */}
      {result && (
        <div style={{
          background: '#4ade8011', border: '1px solid #4ade8030',
          borderRadius: 10, padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <CheckCircle size={20} color="#4ade80" />
          <div>
            <div style={{ fontWeight: 600, color: '#4ade80', marginBottom: 2 }}>Import réussi</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{result.message}</div>
          </div>
          <Link href="/" style={{
            marginLeft: 'auto', background: 'var(--cyan)', color: '#000',
            padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
          }}>
            Voir le dashboard
          </Link>
        </div>
      )}

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

      {/* Threshold */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Seuil de détection</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Transactions au-dessus de ce score seront classées comme fraude
            </div>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--cyan)' }}>
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

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--cyan)' : file ? '#4ade80' : 'var(--border)'}`,
          borderRadius: 12, padding: '48px 32px',
          textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'var(--cyan)08' : 'var(--bg-card)',
          transition: 'all 0.2s',
          marginBottom: 24,
        }}
      >
        <input
          id="file-input" type="file" accept=".csv"
          style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Upload size={32} color={file ? '#4ade80' : 'var(--text-muted)'} style={{ marginBottom: 16 }} />
        {file ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#4ade80' }}>{file.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {(file.size / 1024).toFixed(1)} KB — Prêt à analyser
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Glissez votre fichier CSV ici</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>ou cliquez pour sélectionner</div>
          </>
        )}
      </div>

      {/* Format info */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '16px 20px', marginBottom: 24, fontSize: 12,
        color: 'var(--text-secondary)',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Format attendu</div>
        Colonnes requises : <code style={{ color: 'var(--cyan)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 3 }}>Time, V1–V28, Amount, Class</code>
        <br />Compatible avec le dataset Credit Card Fraud Detection (Kaggle)
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        style={{
          width: '100%', padding: '14px',
          background: file && !loading ? 'var(--cyan)' : 'var(--bg-card)',
          color: file && !loading ? '#000' : 'var(--text-muted)',
          border: '1px solid var(--border)',
          borderRadius: 8, fontSize: 14, fontWeight: 600,
          transition: 'all 0.2s',
          cursor: file && !loading ? 'pointer' : 'not-allowed',
          marginBottom: 12,
        }}
      >
        {loading ? 'Analyse en cours...' : 'Lancer l\'analyse'}
      </button>

      {/* Clear DB */}
      <button
        onClick={handleClearData}
        disabled={clearing || loading}
        style={{
          width: '100%', padding: '12px',
          background: 'transparent',
          color: clearing ? 'var(--text-muted)' : '#f87171',
          border: '1px solid #f8717130',
          borderRadius: 8, fontSize: 13, fontWeight: 500,
          cursor: clearing || loading ? 'not-allowed' : 'pointer',
          opacity: clearing ? 0.6 : 1,
        }}
      >
        {clearing ? 'Suppression...' : 'Vider la base de données'}
      </button>

    </div>
  );
}
