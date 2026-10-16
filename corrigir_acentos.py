from pathlib import Path
import re, shutil, datetime

root=Path(__file__).resolve().parent
# O script deve ser copiado para a raiz do projeto antes de executar.
base=root
if not (base/'app').is_dir():
    raise SystemExit('ERRO: coloque corrigir_acentos.py na raiz D:\\matinal-web')

regras={
 'MÃŠS':'MÊS','mÃŠs':'mês','INÃ\x8dCIO':'INÍCIO','inÃ\x8dcio':'início',
 'PARÃ‚METRO':'PARÂMETRO','parÃ‚metro':'parâmetro',
 'DIFERENÃ‡A':'DIFERENÇA','diferenÃ§a':'diferença',
 'â€”':'—','â€“':'–','â€¢':'•','â€œ':'“','â€\x9d':'”','â€˜':'‘','â€™':'’',
 'Â·':'·','Â°':'°','Âº':'º','Âª':'ª','Â ':' ',
}
# Pares UTF-8 interpretados como Latin-1/Windows-1252: reparo limitado a sequências que começam em Ã.
for b in range(0x80,0xC0):
    try:
        correto=bytes([0xC3,b]).decode('utf-8')
    except UnicodeDecodeError:
        continue
    for encoding in ('latin1','cp1252'):
        try: errado=bytes([0xC3,b]).decode(encoding)
        except UnicodeDecodeError: continue
        if errado!=correto: regras[errado]=correto

extensoes={'.tsx','.ts','.jsx','.js','.css','.json','.html'}
pastas=['app','components','lib']
backup=base/('_backup_acentos_'+datetime.datetime.now().strftime('%Y%m%d_%H%M%S'))
quantidade=0; trocas=0
for pasta in pastas:
    diretorio=base/pasta
    if not diretorio.exists(): continue
    for arquivo in diretorio.rglob('*'):
        if not arquivo.is_file() or arquivo.suffix.lower() not in extensoes: continue
        if 'node_modules' in arquivo.parts or '.next' in arquivo.parts: continue
        try: texto=arquivo.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            print('IGNORADO (nao UTF-8):',arquivo.relative_to(base));continue
        novo=texto; n=0
        for errado,certo in sorted(regras.items(),key=lambda p:-len(p[0])):
            c=novo.count(errado)
            if c:
                novo=novo.replace(errado,certo);n+=c
        if novo!=texto:
            destino=backup/arquivo.relative_to(base)
            destino.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(arquivo,destino)
            arquivo.write_text(novo,encoding='utf-8',newline='')
            print(f'CORRIGIDO: {arquivo.relative_to(base)} ({n} ocorrencias)')
            quantidade+=1;trocas+=n
print(f'\nArquivos corrigidos: {quantidade}; substituicoes: {trocas}')
if quantidade: print('Backup dos originais:',backup)
print('Proximo passo: npm run build')
