﻿$ErrorActionPreference = "Stop"
# 检查是否以管理员权限运行
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if(-not $IsAdmin){
    Write-Host "请以管理员权限运行此脚本！"
    exit
}


# get running script's directory name (not path)
$ScriptDir = Split-Path $PSScriptRoot -Leaf
write-host "ScriptDir: $ScriptDir"
$distFullPath = resolve-path "dist"
$targetDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath("..\resources\app\app_launcher\qqnt-tools")
if(test-path $targetDir){
    # remove old link
    Write-Host "0. 删除旧的链接"
    Remove-Item $targetDir -Force -Recurse
}
# make link
Write-Host "1. 创建软链接: $targetDir -> $distFullPath"
cmd /c mklink /J $targetDir $distFullPath | Out-Null

Get-ChildItem "..\resources\app\app_launcher\index.js" -Include "*.js" -Recurse | ForEach-Object {
    # read with LF
    $content = Get-Content $_.FullName -Raw
    $snippet = "require('./qqnt-tools/qq-main.js')"
    
    if($content -match "(?s)// 企鹅脑瘫 Tools.*?// 企鹅脑瘫 Tools"){
        $content = $content -replace "(?s)// 企鹅脑瘫 Tools.*?// 企鹅脑瘫 Tools", "// 企鹅脑瘫 Tools`n$snippet`n// 企鹅脑瘫 Tools";
    }
    else{
        $content = "// 企鹅脑瘫 Tools`n$snippet`n// 企鹅脑瘫 Tools`n$content";
    }
    Write-Host "2. 修改文件: $_"
    Set-Content $_.FullName $content -Encoding UTF8 -NoNewline
}

# Wait for user close the window
Write-Host "安装完成，请重启企鹅脑瘫！"