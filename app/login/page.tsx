'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Resultado = { ok?: boolean; erro?: string; destino?: string };

function LogoKidy() {
  const [falhou, setFalhou] = useState(false);
  return !falhou ? (
    <img src="/kidy-logo.png" alt="KIDY" onError={() => setFalhou(true)} style={{ width: 155, height: 76, objectFit: 'contain', objectPosition: 'left center' }} />
  ) : <strong style={{ fontSize: 38, color: '#ff6900', letterSpacing: 1 }}>KIDY</strong>;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (carregando) return;
    setCarregando(true);
    setErro('');
    try {
      const resposta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha }),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const resultado = (await resposta.json()) as Resultado;
      if (!resposta.ok || !resultado.ok) throw new Error(resultado.erro || 'Não foi possível entrar');
      router.replace(resultado.destino === '/trocar-senha' ? '/trocar-senha' : '/portal');
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao entrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: '#f3f5f9', fontFamily: 'Arial, sans-serif' }}>
      <form onSubmit={entrar} style={{ background: '#fff', padding: 36, borderRadius: 16, width: 'min(92vw, 420px)', boxShadow: '0 12px 40px #17203316', display: 'grid', gap: 16 }}>
        <LogoKidy />
        <h1 style={{ margin: 0, color: '#1f2937', fontSize: 23 }}>Matinal Comercial Nacional</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Entre com seu e-mail corporativo.</p>
        <label style={label}>E-mail<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={input} /></label>
        <label style={label}>Senha<input type="password" required autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} style={input} /></label>
        {erro && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{erro}</p>}
        <button type="submit" disabled={carregando} style={{ padding: 14, background: '#ff6900', color: '#fff', border: 0, borderRadius: 9, cursor: carregando ? 'wait' : 'pointer', fontWeight: 700, opacity: carregando ? .7 : 1 }}>{carregando ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </main>
  );
}

const label: CSSProperties = { display: 'grid', gap: 6, fontSize: 14, color: '#374151', fontWeight: 600 };
const input: CSSProperties = { display: 'block', width: '100%', padding: 12, boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 };
