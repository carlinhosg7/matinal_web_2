'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const paginas = [
  { nome: 'FATURAMENTO', href: '/faturamento' },
  { nome: 'ENTRADA', href: '/entrada' },
  { nome: 'COBERTURA', href: '/cobertura' },
  { nome: 'PROJETOS ESPECIAIS', href: '/projetos-especiais' },
  { nome: 'BRINQUEDOS', href: '/brinquedos' },
];

export default function MatinalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação Matinal Comercial" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 2, width: '100%', margin: '0 auto 18px' }}>
      {paginas.map(({ nome, href }) => {
        const ativo = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={href} href={href} aria-current={ativo ? 'page' : undefined} style={{ background: ativo ? '#ff6b00' : '#7d8793', color: '#fff', fontWeight: 800, fontSize: 12, textAlign: 'center', padding: '14px 6px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 42 }}>
            {nome}
          </Link>
        );
      })}
    </nav>
  );
}
