# Matinal Comercial Web — fase 1

Migração inicial da página FATURAMENTO do PBIX. **Não é ainda equivalente ao Power BI**.

## Executar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000/faturamento

## Dados

Coloque em `dados/` arquivos com os nomes-base `FATURAMENTO MES`, `METAS FATURAMENTO` e `CAD_REPRESENTANTE`, com extensão `.xlsx`, `.csv` ou `.parquet`. A primeira aba dos arquivos Excel é utilizada.

O endpoint `/api/faturamento` lê os arquivos a cada solicitação. O frontend exibe apenas somas **preliminares** sem equivalência DAX garantida. Não usar esses números como resultado oficial.

## Referência extraída

`referencia/faturamento-visuais.json` contém os visuais e as referências de campos da página original. O modelo tabular DAX não foi reconstruído nesta etapa.

## Pendências antes de produção

1. Exportar medidas DAX, tabelas e relacionamentos do modelo original (por exemplo, com DAX Studio/Tabular Editor).
2. Confirmar granularidade e nomes de colunas das bases diárias.
3. Implementar e testar equivalência de medidas, comparações anuais, filtros de supervisor/representante e tabelas detalhadas.
4. Definir ingestão atômica/validação de arquivos e autenticação/autorização no servidor.
5. Publicar em hospedagem com armazenamento persistente, sem expor arquivos comerciais publicamente.
