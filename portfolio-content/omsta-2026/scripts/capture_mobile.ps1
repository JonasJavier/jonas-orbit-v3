# portfolio-content/omsta-2026/scripts/capture_mobile.ps1
# Ayudas para capturar la app Omsta en un Android real por adb.
#
# Uso (PowerShell, con el teléfono desbloqueado y la build de desarrollo instalada):
#   . "<ruta>\capture_mobile.ps1"
#   Start-OmstaDemoMode            # barra de estado limpia: 9:41, batería llena, sin avisos
#   Open-OmstaApp                  # carga el bundle de Metro (127.0.0.1:8081 por adb reverse)
#   Save-Shot m05-inicio           # PNG a resolución nativa, sin reescalar
#   Get-UiText                     # textos visibles con sus coordenadas
#   Tap-Text "Reservas"            # toca el primer elemento cuyo texto coincide
#   Stop-OmstaDemoMode             # devuelve la barra de estado normal
#
# Preparación (una vez por sesión):
#   - Servidor de portafolio en 127.0.0.1:8130 (BD omsta_portfolio).
#   - Metro con EXPO_PUBLIC_API_URL=http://127.0.0.1:8130 (npm start --prefix mobile -- --port 8081).
#   - adb reverse tcp:8081 tcp:8081 ; adb reverse tcp:8130 tcp:8130

$script:OmstaOut = if ($env:OMSTA_MOBILE_OUT) { $env:OMSTA_MOBILE_OUT } else {
    Join-Path $PSScriptRoot "..\mobile\screenshots\raw" }
$script:UiXml = Join-Path $env:TEMP "omsta-ui.xml"

function Start-OmstaDemoMode {
    adb shell settings put global sysui_demo_allowed 1
    $b = "com.android.systemui.demo"
    adb shell am broadcast -a $b -e command enter | Out-Null
    adb shell am broadcast -a $b -e command clock -e hhmm 0941 | Out-Null
    adb shell am broadcast -a $b -e command battery -e level 100 -e plugged false -e powersave false | Out-Null
    adb shell am broadcast -a $b -e command network -e wifi show -e level 4 -e fully true | Out-Null
    adb shell am broadcast -a $b -e command network -e mobile hide | Out-Null
    adb shell am broadcast -a $b -e command notifications -e visible false | Out-Null
    adb shell am broadcast -a $b -e command status -e volume hide -e bluetooth hide -e location hide -e alarm hide -e zen hide -e mute hide -e sync hide -e cast hide -e hotspot hide | Out-Null
}

function Stop-OmstaDemoMode {
    adb shell am broadcast -a com.android.systemui.demo -e command exit | Out-Null
    adb shell settings put global sysui_demo_allowed 0
}

function Open-OmstaApp {
    adb shell am start -W -a android.intent.action.VIEW -d "exp+omsta-movil://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" | Out-Null
}

function Save-Shot([string]$Name) {
    $out = if ($env:OMSTA_MOBILE_OUT) { $env:OMSTA_MOBILE_OUT } else { $script:OmstaOut }
    New-Item -ItemType Directory -Force $out | Out-Null
    $dest = Join-Path $out "$Name.png"
    # SystemUI abandona el modo demo con ciertos eventos (carga, intents): reaplicarlo.
    Start-OmstaDemoMode
    Start-Sleep -Milliseconds 700
    # exec-out entrega el PNG binario tal cual; cmd evita que PowerShell lo recodifique.
    cmd /c "adb exec-out screencap -p > `"$dest`""
    $dest
}

function Get-UiNodes {
    # uiautomator falla («null root node») mientras hay animaciones: reintentar.
    for ($i = 0; $i -lt 5; $i++) {
        adb shell rm -f /sdcard/omsta-ui.xml 2>$null | Out-Null
        $r = adb shell uiautomator dump /sdcard/omsta-ui.xml 2>&1
        if ("$r" -match "dumped to") {
            adb pull /sdcard/omsta-ui.xml $script:UiXml 2>&1 | Out-Null
            return ([xml](Get-Content -Encoding UTF8 $script:UiXml)).SelectNodes("//node")
        }
        Start-Sleep -Milliseconds 800
    }
    throw "uiautomator no pudo volcar la pantalla"
}

function Get-UiText {
    Get-UiNodes | Where-Object { $_.text -or $_.'content-desc' } |
        ForEach-Object { "{0}{1} | {2}" -f $_.text, $(if ($_.'content-desc') { " [$($_.'content-desc')]" }), $_.bounds }
}

function Get-Center([string]$Bounds) {
    $n = [regex]::Matches($Bounds, '\d+') | ForEach-Object { [int]$_.Value }
    @([int](($n[0] + $n[2]) / 2), [int](($n[1] + $n[3]) / 2))
}

function Tap-Text([string]$Text, [int]$Index = 0) {
    $hits = @(Get-UiNodes | Where-Object { $_.text -eq $Text -or $_.'content-desc' -eq $Text })
    if ($hits.Count -le $Index) {
        $hits = @(Get-UiNodes | Where-Object { $_.text -like "*$Text*" -or $_.'content-desc' -like "*$Text*" })
    }
    if ($hits.Count -le $Index) { throw "No encontré «$Text» en pantalla" }
    $c = Get-Center $hits[$Index].bounds
    adb shell input tap $c[0] $c[1]
}

function Scroll-Down([int]$Pixels = 1200) {
    adb shell input swipe 540 1900 540 (1900 - $Pixels) 450
}
