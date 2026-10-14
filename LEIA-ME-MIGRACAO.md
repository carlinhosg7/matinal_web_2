# Migração das APIs comerciais para Google Drive

1. No Google Apps Script, substitua **Código.gs** pelo conteúdo de `APPS_SCRIPT_CODIGO_GS.txt`. **Não execute configurarToken** se já tem token: a função mantém o existente. Atualize a implantação existente com **New version**. A URL e o token não mudam.
2. No Next.js, mescle as pastas `app` e `lib` deste pacote no projeto `D:\matinal-web`. Não copie o arquivo `APPS_SCRIPT_CODIGO_GS.txt` para a pasta `app`.
3. Remova `MATINAL_DATA_DIR` e demais `MATINAL_*_DIR` da Vercel, pois não são utilizados pelas APIs migradas. Mantenha `GOOGLE_APPS_SCRIPT_URL` e `GOOGLE_APPS_SCRIPT_TOKEN` como variáveis **somente do servidor**.
4. Execute `npm install`, `npm run build`, e só publique se compilar. Teste cada dashboard. O pacote não altera cálculos ou páginas, somente a origem das planilhas.

## Limitações
- Arquivos grandes como TORRE 02 (~8,8 MB) geram ~11,7 MB em Base64. O Apps Script pode exceder limites de resposta/tempo, e a Vercel pode exceder duração/memória. Esses dashboards precisam de teste real; o pacote não garante sucesso para arquivos grandes. Se falhar, será necessário outro transporte (ex.: sincronização prévia em storage privado), não aumentar limites indefinidamente.
- O Web App do Apps Script está acessível por URL pública e usa token na query string. Evite divulgar URL com token e não compartilhe logs contendo esse parâmetro. Para produção com dados comerciais sensíveis, recomenda-se autenticação de serviço mais robusta.
- A rota `/api/drive-excel` continua sendo diagnóstico. O módulo `lib/drive-source.ts` é a origem central das APIs comerciais.
- A API `entrada-semanal` continua exigindo sua tabela de permissões no Supabase.
