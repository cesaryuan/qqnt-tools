# get running script's directory name (not path)
$ScriptDir = Split-Path $PSScriptRoot -Leaf
write-host "ScriptDir: $ScriptDir"
# make link
cmd /c mklink /D "..\resources\app\app_launcher\qqnt-tools" "..\..\..\$ScriptDir\dist"

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
    Set-Content $_.FullName $content
}

# Wait for user close the window
Write-Host "安装完成，请重启QQ！"
