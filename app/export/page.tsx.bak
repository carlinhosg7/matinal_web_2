import Link from 'next/link';
import Image from 'next/image';
import {redirect} from 'next/navigation';
import {usuarioAtual} from '../../lib/matinal-auth';

export const dynamic = 'force-dynamic';

const telas = [
  {titulo:'Entrada', rota:'/export/entrada', descricao:'Metas, pedidos e evolução das vendas', icone:'↗'},
  {titulo:'Faturamento', rota:'/export/faturamento', descricao:'Receita, pares, carteira e tendências', icone:'▥'},
  {titulo:'Clientes', rota:'/export/clientes', descricao:'Desempenho de clientes e países', icone:'♙'},
  {titulo:'Fechamento Semanal', rota:'/export/fechamento-semanal', descricao:'Resumo comercial do mês', icone:'▦'},
  {titulo:'Planejamento', rota:'/export/planejamento', descricao:'Planejamento comercial da Exportação', icone:'◎', novo:true},
];

export default async function Export() {
  const user = await usuarioAtual();
  if (!user) redirect('/login');
  if ((user.perfil!=='ADMINISTRADOR' && user.email.trim().toLowerCase()!=='andreia.cristina@kidy.com.br')) {
    return <main style={{padding:30,fontFamily:'Arial,sans-serif'}}>Exportação ainda não habilitada para este perfil. <Link href="/portal">Voltar ao portal</Link></main>;
  }
  return (
    <main className="exp-portal">
      <div className="exp-container">
        <Link className="exp-back" href="/portal">← Voltar ao portal</Link>
        <header className="exp-header">
          <div className="exp-brand">
            <div className="exp-logo"><Image src="/kidy-logo.png" alt="Logo Kidy" width={106} height={82} priority style={{objectFit:'contain',width:'100%',height:'100%'}} /></div>
            <div>
              <div className="exp-kicker">MATINAL COMERCIAL</div>
              <h1>Exportação</h1>
              <p>Indicadores e inteligência comercial internacional</p>
            </div>
          </div>
          <div className="exp-header-tag">Painel de gestão</div>
        </header>

        <section aria-labelledby="exp-menu-title">
          <div className="exp-title-row"><div><h2 id="exp-menu-title">Áreas de análise</h2><p>Escolha o módulo que deseja acompanhar.</p></div><span className="exp-count">5 módulos</span></div>
          <div className="exp-grid">
            {telas.map((t,i)=>(
              <Link key={t.rota} className={'exp-card'+(t.novo?' exp-new':'')} href={t.rota}>
                <div className="exp-card-top"><div className="exp-symbol" aria-hidden="true">{t.icone}</div>{t.novo&&<span className="exp-pill">NOVO</span>}</div>
                <h3>{t.titulo}</h3>
                <p>{t.descricao}</p>
                <div className="exp-card-bottom"><span>Acessar módulo</span><span aria-hidden="true">→</span></div>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <style>{`
        .exp-portal{min-height:100vh;background:#f3f5f9;color:#142943;font-family:Arial,Helvetica,sans-serif;padding:34px 24px 72px}
        .exp-container{max-width:1190px;margin:0 auto}
        .exp-back{color:#385d88;text-decoration:none;font-size:14px;font-weight:600}
        .exp-back:hover{text-decoration:underline}
        .exp-header{display:flex;align-items:center;justify-content:space-between;gap:20px;background:white;border:1px solid #e6eaf0;border-radius:18px;padding:25px 33px;margin:23px 0 30px;box-shadow:0 8px 28px rgba(21,42,72,.045)}
        .exp-brand{display:flex;align-items:center;gap:27px}
        .exp-logo{display:flex;align-items:center;justify-content:center;width:112px;height:93px;flex-shrink:0}
        .exp-kicker{font-size:12px;letter-spacing:2px;font-weight:800;color:#ff6a00;margin-bottom:7px}
        .exp-header h1{margin:0;font-size:37px;line-height:1.15;letter-spacing:-.8px}
        .exp-header p{font-size:14px;color:#718099;margin:9px 0 0}
        .exp-header-tag{background:#fff5eb;color:#c65500;border:1px solid #ffe0c5;padding:10px 15px;border-radius:30px;font-size:12px;font-weight:800;white-space:nowrap}
        .exp-title-row{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px}
        .exp-title-row h2{font-size:24px;margin:0 0 7px}.exp-title-row p{margin:0;color:#718099;font-size:14px}
        .exp-count{background:#e6ebf2;border-radius:50px;padding:9px 15px;color:#49617f;font-size:12px;font-weight:700}
        .exp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
        .exp-card{position:relative;display:flex;flex-direction:column;min-height:224px;padding:23px 24px 19px;background:#fff;border:1px solid #e4e8ef;border-radius:17px;text-decoration:none;color:#142943;box-shadow:0 3px 14px rgba(19,39,70,.045);transition:transform .18s,box-shadow .18s,border-color .18s}
        .exp-card:hover,.exp-card:focus-visible{transform:translateY(-4px);border-color:#ff790d;box-shadow:0 13px 29px rgba(18,41,72,.12);outline:none}
        .exp-card-top{display:flex;justify-content:space-between;align-items:center}
        .exp-symbol{display:flex;justify-content:center;align-items:center;width:46px;height:46px;border-radius:13px;background:#fff0e2;color:#ee6500;font-size:27px;font-weight:700}
        .exp-pill{font-size:10px;font-weight:800;color:#ba5300;background:#fff1db;padding:6px 9px;border-radius:20px;letter-spacing:.6px}
        .exp-card h3{font-size:19px;margin:19px 0 7px}.exp-card p{margin:0;color:#64758d;font-size:13px;line-height:1.55;flex:1}
        .exp-card-bottom{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #edf0f5;margin-top:20px;padding-top:15px;color:#ed6800;font-size:13px;font-weight:800}
        .exp-card-bottom span:last-child{font-size:22px;line-height:1}
        .exp-new{border-color:#f4c9a8}
        @media(max-width:850px){.exp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.exp-header-tag{display:none}}
        @media(max-width:550px){.exp-portal{padding:22px 15px}.exp-header{padding:20px}.exp-brand{gap:13px}.exp-logo{width:77px;height:72px}.exp-header h1{font-size:28px}.exp-header p{font-size:12px}.exp-grid{grid-template-columns:1fr}.exp-card{min-height:188px}.exp-title-row h2{font-size:21px}}
      `}</style>
    </main>
  );
}
