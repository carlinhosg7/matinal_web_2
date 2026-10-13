import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioAtual, podeAcessar, type Tela } from '../../lib/matinal-auth';

export const dynamic = 'force-dynamic';

const dashboards: { rota: Tela; nome: string }[] = [
  { rota: 'faturamento', nome: 'Faturamento' },
  { rota: 'entrada', nome: 'Entrada' },
  { rota: 'cobertura', nome: 'Cobertura de Carteira' },
  { rota: 'projetos-especiais', nome: 'Projetos Especiais' },
  { rota: 'brinquedos', nome: 'Brinquedos' },
];

export default async function Matinal() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect('/login');
  return <main style={{ minHeight: '100vh', background: '#f3f5f9', fontFamily: 'Arial, sans-serif', padding: 30 }}>
    <div style={{ maxWidth: 1050, margin: '0 auto' }}>
      <Link href="/portal" style={{ color: '#ff6900', textDecoration: 'none', fontWeight: 700 }}>← Voltar ao menu</Link>
      <h1 style={{ color: '#222b39', marginTop: 30 }}>Matinal Comercial</h1>
      <p style={{ color: '#64748b' }}>Selecione o painel que deseja consultar.</p>
      <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 15, marginTop: 24 }}>
        {dashboards.filter(d => podeAcessar(usuario, d.rota)).map(d => <Link key={d.rota} href={'/' + d.rota} style={{ padding: 25, background: '#ff6900', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 700, textAlign: 'center' }}>{d.nome}</Link>)}
      </nav>
    </div>
  </main>;
}
