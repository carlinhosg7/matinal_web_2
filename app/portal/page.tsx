import { redirect } from 'next/navigation';
import Link from 'next/link';
import { usuarioAtual } from '../../lib/matinal-auth';
import Sair from './sair';

export const dynamic = 'force-dynamic';

const modulos = [
  { nome: 'Matinal', rota: '/matinal', detalhe: 'Indicadores comerciais' },
  { nome: 'Entrada Semanal', rota: '/entrada-semanal', detalhe: 'Metas e realizado por regional' },
  { nome: 'Representantes', rota: '/representantes', detalhe: 'Gestão de representantes' },
  { nome: 'Kidex', rota: '/kidex', detalhe: 'Indicadores Kidex' },
  { nome: 'Export', rota: '/export', detalhe: 'Exportação' },
] as const;

export default async function Portal() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/login');
  return (
    <main style={{ minHeight: '100vh', background: '#f3f5f9', fontFamily: 'Arial, sans-serif', padding: '30px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ background: '#fff', padding: '22px 26px', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', boxShadow: '0 4px 22px #1720330c' }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 140, height: 66, display: 'flex', alignItems: 'center' }}>
              <img src="/kidy-logo.png" alt="KIDY" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <div><h1 style={{ margin: '0 0 6px', fontSize: 23, color: '#222b39' }}>Matinal Comercial Nacional</h1><div style={{ color: '#64748b', fontSize: 14 }}>{usuario.nome} · {usuario.perfil}</div></div>
          </div>
          <Sair />
        </header>
        <h2 style={{ margin: '32px 0 18px', fontSize: 21, color: '#1f2937' }}>Menu de acesso</h2>
        <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          {modulos.filter(m => usuario.perfil !== 'EXPORTACAO' || m.rota === '/export').map(m => <Link key={m.rota} href={m.rota} style={{ background: '#ff6900', color: '#fff', padding: '28px 22px', minHeight: 95, borderRadius: 12, textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, boxShadow: '0 6px 15px #ff69001a' }}><strong style={{ fontSize: 19 }}>{m.nome}</strong><span style={{ fontSize: 13, opacity: .9 }}>{m.detalhe}</span></Link>)}
          {usuario.perfil === 'ADMINISTRADOR' && <Link href="/admin/usuarios" style={{ background: '#30343b', color: '#fff', padding: '28px 22px', minHeight: 95, borderRadius: 12, textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}><strong style={{ fontSize: 19 }}>Cadastro de Usuários</strong><span style={{ fontSize: 13, opacity: .9 }}>Acessos e permissões</span></Link>}
        </nav>
      </div>
    </main>
  );
}
