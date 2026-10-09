$ErrorActionPreference = "Stop"

$destino = "I:\Meu Drive\Dados Matinal"
$pastaProjeto = "D:\matinal-web"
$pastaLogs = Join-Path $pastaProjeto "logs"
$arquivoConfig = Join-Path $pastaProjeto "origem_dados.txt"

New-Item -ItemType Directory -Path $pastaLogs -Force | Out-Null

# Recupera a origem configurada anteriormente
$origem = $null

if (Test-Path -LiteralPath $arquivoConfig) {
    $origem = (Get-Content -LiteralPath $arquivoConfig -Raw).Trim()
}

# Caso a origem nao exista, solicita a selecao
if (!$origem -or !(Test-Path -LiteralPath $origem -PathType Container)) {

    Write-Host ""
    Write-Host "SELECIONE A PASTA ORIGINAL DOS ARQUIVOS EXCEL."
    Write-Host "Nao selecione a pasta do Google Drive."
    Write-Host ""

    Add-Type -AssemblyName System.Windows.Forms

    $janela = New-Object System.Windows.Forms.FolderBrowserDialog
    $janela.Description = "Selecione a pasta de origem das bases MATINAL"
    $janela.ShowNewFolderButton = $false

    if ($janela.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
        throw "Selecao cancelada."
    }

    $origem = $janela.SelectedPath
}

# Normaliza os caminhos
$origemCompleta = [System.IO.Path]::GetFullPath($origem).TrimEnd('\')
$destinoCompleto = [System.IO.Path]::GetFullPath($destino).TrimEnd('\')

# Impede copia da pasta para ela mesma ou entre pastas aninhadas
if (
    $origemCompleta.Equals($destinoCompleto, [System.StringComparison]::OrdinalIgnoreCase) -or
    $origemCompleta.StartsWith($destinoCompleto + "\", [System.StringComparison]::OrdinalIgnoreCase) -or
    $destinoCompleto.StartsWith($origemCompleta + "\", [System.StringComparison]::OrdinalIgnoreCase)
) {
    throw "ERRO: origem e destino sao iguais ou uma pasta esta dentro da outra."
}

if (!(Test-Path -LiteralPath "I:\Meu Drive" -PathType Container)) {
    throw "Google Drive I: indisponivel."
}

# Confere se existem arquivos
$arquivos = @(Get-ChildItem -LiteralPath $origemCompleta -File -Recurse -ErrorAction Stop)

if ($arquivos.Count -eq 0) {
    throw "A pasta de origem nao possui arquivos. Nenhuma copia realizada."
}

# Salva a origem correta para proximas execucoes
Set-Content -LiteralPath $arquivoConfig -Value $origemCompleta -Encoding UTF8

New-Item -ItemType Directory -Path $destinoCompleto -Force | Out-Null

$dataHora = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$log = Join-Path $pastaLogs "sync_$dataHora.log"

Write-Host ""
Write-Host "========================================="
Write-Host " MATINAL COMERCIAL - SINCRONIZACAO"
Write-Host "========================================="
Write-Host "Origem: $origemCompleta"
Write-Host "Destino: $destinoCompleto"
Write-Host "Arquivos encontrados: $($arquivos.Count)"
Write-Host ""

robocopy $origemCompleta $destinoCompleto /E /FFT /Z /R:3 /W:5 /NP /TEE "/LOG:$log"

$codigo = $LASTEXITCODE

if ($codigo -ge 8) {
    throw "Falha na copia. Codigo Robocopy: $codigo. Log: $log"
}

Write-Host ""
Write-Host "COPIA CONCLUIDA."
Write-Host "Arquivos de origem: $($arquivos.Count)"
Write-Host "Log: $log"
Write-Host "Aguarde o Google Drive concluir o envio para a nuvem."
