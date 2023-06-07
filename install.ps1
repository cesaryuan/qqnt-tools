﻿$ErrorActionPreference = "Stop"

# get running script's directory name (not path)
$ScriptDir = Split-Path $PSScriptRoot -Leaf
write-host "ScriptDir: $ScriptDir"
$distFullPath = resolve-path "dist"
$targetDir = resolve-path "..\resources\app\app_launcher\qqnt-tools"
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
    if($content -match "(?s)// Cesar.*?// Cesar"){
        $content = $content -replace "(?s)// Cesar.*?// Cesar", "// Cesar`n$snippet`n// Cesar";
    }
    else{
        $content = "// Cesar`n$snippet`n// Cesar`n$content";
    }
    Write-Host "2. 修改文件: $_"
    Set-Content $_.FullName $content
}

# Wait for user close the window
Write-Host "安装完成，请重启QQ！"
