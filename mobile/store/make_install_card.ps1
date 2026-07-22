Add-Type -AssemblyName System.Drawing

$icon = "C:\Users\User\Desktop\sweetpotato\mobile\assets\icon\app_icon.png"
$qr   = "C:\Users\User\Desktop\sweetpotato\mobile\store\qr-optin.png"
$dst  = "C:\Users\User\Desktop\sweetpotato\mobile\store\install-guide-card.png"
$link = "https://play.google.com/apps/internaltest/4700252716227484748"

$W = 1080
$H = 1920

$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

function New-RoundedPath([single]$x,[single]$y,[single]$w,[single]$h,[single]$r){
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# background cream
$g.Clear([System.Drawing.Color]::FromArgb(253,244,231))

# ---- header band ----
$hRect = New-Object System.Drawing.Rectangle(0,0,$W,300)
$hb = New-Object System.Drawing.Drawing2D.LinearGradientBrush($hRect, [System.Drawing.Color]::FromArgb(232,132,42), [System.Drawing.Color]::FromArgb(210,74,30), 0.0)
$g.FillRectangle($hb, $hRect)
$hb.Dispose()

# app icon (rounded) in header
$img = [System.Drawing.Image]::FromFile($icon)
$icP = New-RoundedPath 60 60 180 180 32
$g.SetClip($icP)
$g.DrawImage($img, 60, 60, 180, 180)
$g.ResetClip()
$img.Dispose()

$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$titleFont = New-Object System.Drawing.Font("Microsoft JhengHei", 46, [System.Drawing.FontStyle]::Bold)
$g.DrawString("磐石烤地瓜", $titleFont, $white, 270, 85)
$subFont = New-Object System.Drawing.Font("Microsoft JhengHei", 27, [System.Drawing.FontStyle]::Regular)
$g.DrawString("App 安裝說明（給測試者）", $subFont, $white, 273, 180)

# ---- step cards ----
$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(74,38,10))
$grayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90,70,55))
$orange = [System.Drawing.Color]::FromArgb(216,74,30)
$cardTitleFont = New-Object System.Drawing.Font("Microsoft JhengHei", 33, [System.Drawing.FontStyle]::Bold)
$cardBodyFont = New-Object System.Drawing.Font("Microsoft JhengHei", 26, [System.Drawing.FontStyle]::Regular)
$numFont = New-Object System.Drawing.Font("Microsoft JhengHei", 40, [System.Drawing.FontStyle]::Bold)

$steps = @(
  @{ n="1"; t="確認 Google 帳號"; b="手機 Google Play 登入的 Gmail，要是店家加入名單的那一個。" },
  @{ n="2"; t="加入測試"; b="掃描下方 QR Code（或點連結），再按「成為測試人員 / Become a tester」。" },
  @{ n="3"; t="下載安裝"; b="按「Download test app」→ 安裝 → 開啟，就能使用了！" }
)

$cy = 350
$cardH = 210
$sf = New-Object System.Drawing.StringFormat
foreach($s in $steps){
  $cardPath = New-RoundedPath 50 $cy 980 $cardH 28
  $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.FillPath($cardBrush, $cardPath)
  $cardBrush.Dispose()
  # number circle
  $circle = New-Object System.Drawing.Drawing2D.GraphicsPath
  $circle.AddEllipse(90, ($cy+55), 100, 100)
  $cb = New-Object System.Drawing.SolidBrush($orange)
  $g.FillPath($cb, $circle)
  $numSf = New-Object System.Drawing.StringFormat
  $numSf.Alignment = [System.Drawing.StringAlignment]::Center
  $numSf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $numRect = New-Object System.Drawing.RectangleF(90, ($cy+55), 100, 100)
  $g.DrawString($s.n, $numFont, $white, $numRect, $numSf)
  $cb.Dispose(); $circle.Dispose()
  # title + body
  $g.DrawString($s.t, $cardTitleFont, $darkBrush, 230, ($cy+38))
  $bodyRect = New-Object System.Drawing.RectangleF(230, ($cy+96), 760, 100)
  $g.DrawString($s.b, $cardBodyFont, $grayBrush, $bodyRect, $sf)
  $cy += $cardH + 30
}

# ---- QR section ----
$qrCap = New-Object System.Drawing.Font("Microsoft JhengHei", 36, [System.Drawing.FontStyle]::Bold)
$capSf = New-Object System.Drawing.StringFormat
$capSf.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("▼ 掃我加入測試 ▼", $qrCap, (New-Object System.Drawing.SolidBrush($orange)), (New-Object System.Drawing.RectangleF(0, 1070, $W, 60)), $capSf)

$qrImg = [System.Drawing.Image]::FromFile($qr)
$qrSize = 380
$qrX = [int](($W - $qrSize) / 2)
$qrY = 1135
# white rounded backing
$qrBack = New-RoundedPath ($qrX-20) ($qrY-20) ($qrSize+40) ($qrSize+40) 24
$g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), $qrBack)
$g.DrawImage($qrImg, $qrX, $qrY, $qrSize, $qrSize)
$qrImg.Dispose()

# link text
$linkFont = New-Object System.Drawing.Font("Consolas", 18, [System.Drawing.FontStyle]::Regular)
$g.DrawString($link, $linkFont, $grayBrush, (New-Object System.Drawing.RectangleF(0, 1548, $W, 40)), $capSf)

# ---- footer tips ----
$tipPath = New-RoundedPath 50 1600 980 270 24
$g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,238,214))), $tipPath)
$tipTitleFont = New-Object System.Drawing.Font("Microsoft JhengHei", 26, [System.Drawing.FontStyle]::Bold)
$tipFont = New-Object System.Drawing.Font("Microsoft JhengHei", 23, [System.Drawing.FontStyle]::Regular)
$g.DrawString("小提醒", $tipTitleFont, (New-Object System.Drawing.SolidBrush($orange)), 90, 1620)
$tip = "‧ 剛發布請等 15~60 分鐘才裝得到，若顯示「找不到項目」稍後再試。`n‧ App 名稱暫時顯示 (unreviewed) 為正常，審核通過後會變回「磐石烤地瓜」。"
$g.DrawString($tip, $tipFont, $darkBrush, (New-Object System.Drawing.RectangleF(90, 1672, 900, 180)), $sf)

$bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
"saved $dst"


