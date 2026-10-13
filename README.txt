NAVEGACAO GLOBAL - MATINAL WEB

1. Copie components/MatinalNav.tsx e components/MatinalNav.css para D:\matinal-web\components.
2. No app/layout.tsx EXISTENTE, adicione:
   import MatinalNav from '../components/MatinalNav';
   e coloque <MatinalNav /> DENTRO de <body>, ANTES de {children}.
   Exemplo: <body><MatinalNav />{children}</body>
   IMPORTANTE: preserve imports, metadata, providers, classes e estilos existentes.
3. REMOVA os menus superiores antigos de app/faturamento/page.tsx e app/entrada/page.tsx (e das demais paginas que os tenham), para nao duplicar.
4. Garanta que cada rota exista. Links para rotas ainda nao criadas levam a 404 ate a pagina ser implementada.
5. Reinicie o servidor de desenvolvimento se necessario.

Nao substitua o layout.tsx inteiro sem inspecionar o arquivo original: ele pode conter estilos globais, fontes, provedores e outras configuracoes.
