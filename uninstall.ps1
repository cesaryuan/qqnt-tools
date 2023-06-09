$ErrorActionPreference = "Stop"
# 检查是否以管理员权限运行
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if(-not $IsAdmin){
    Write-Host "请以管理员权限运行此脚本！"
    exit
}
# get running script's directory name (not path)
$targetDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath("..\resources\app\app_launcher\qqnt-tools")
if(test-path $targetDir) {
    Write-Host "1. 删除链接"
    Remove-Item $targetDir -Force -Recurse
}

Get-ChildItem "..\resources\app\app_launcher\index.js" -Include "*.js" -Recurse | ForEach-Object {
    # read with LF
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "(?s)// 企鹅脑瘫 Tools.*?// 企鹅脑瘫 Tools`n", "";
    $content = $content -replace "(?s)// ĆóśěÄÔĚą Tools.*?// ĆóśěÄÔĚą Tools`n", "";
    Write-Host "2. 复原文件: $_"
    Set-Content $_.FullName $content -Encoding UTF8 -NoNewline
}

# Wait for user close the window
Write-Host "卸载完成，请重启企鹅脑瘫！"
