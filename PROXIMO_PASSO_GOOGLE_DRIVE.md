# Etapa 1: teste seguro da conexão Vercel → Apps Script

Foi adicionada a rota `/api/drive-status`, restrita ao perfil ADMINISTRADOR. Ela consulta `acao=listar` na implantação atual do Apps Script e devolve somente nome, tamanho e data dos arquivos (não revela o token nem os IDs do Drive).

1. Confira as variáveis Production na Vercel: `GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_APPS_SCRIPT_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Publique este código no GitHub e faça Redeploy.
3. Entre como administrador e acesse `https://SEU-DOMINIO/api/drive-status`.
4. Resultado esperado: JSON com `sucesso:true`, `total:26` e os nomes/tamanhos dos arquivos.
5. Se houver erro, consulte os Function Logs da Vercel. Não compartilhe tokens, chaves nem URL com `token=`.

IMPORTANTE: esta etapa valida apenas a comunicação. As APIs comerciais ainda leem caminhos locais e não foram migradas. Não remova `MATINAL_DATA_DIR` do ambiente de desenvolvimento. A próxima etapa exige definir transporte seguro dos arquivos XLSX e limites de tamanho antes de modificar os cálculos.

SEGURANÇA: o Apps Script publicado como `Anyone` e token em query string não é uma solução ideal para dados comerciais. Mantenha a API limitada a metadados nesta etapa. Para dados de produção, adote autenticação e transporte adequados antes de expor conteúdos.
