'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AddClientForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:8080/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setName('');
      setEmail('');
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Une erreur s'est produite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: '24px', display: 'grid', gap: 8, maxWidth: 480 }}>
      <h2>Ajouter un client</h2>
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Nom</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Nom'
          required
          style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        />
      </label>
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='email@example.com'
          type='email'
          required
          style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        />
      </label>
      {error && <div style={{ color: '#b00020' }}>{error}</div>}
      <button
        type='submit'
        disabled={submitting}
        style={{
          padding: '10px 14px',
          background: submitting ? '#999' : '#111',
          color: '#fff',
          border: 0,
          borderRadius: 4,
          cursor: submitting ? 'not-allowed' : 'pointer',
          width: 'fit-content',
        }}
      >
        {submitting ? 'Ajout en cours...' : 'Ajouter'}
      </button>
    </form>
  );
}


