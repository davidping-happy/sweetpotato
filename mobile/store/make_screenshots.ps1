Add-Type -AssemblyName System.Drawing

$assets = "C:\Users\User\.cursor\projects\c-Users-User-Desktop-sweetpotato\assets"
$out = "C:\Users\User\Desktop\sweetpotato\mobile\store\screenshots"

# source screenshot, caption
$items = @(
  @{ src = "$assets\c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_8376e309650b92fb678a1a73ad5bca0f_images_649973_0-b908562e-c9c9-4465-87cd-903677a45290.png"; cap = "阿嬤的手工精選，炭火慢烤"; name = "01_home.png" },
  @{ src = "$assets\c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_8376e309650b92fb678a1a73ad5bca0f_images_649974_0-3875979e-ed0f-4f8f-bd31-2ce658cc48cc.png"; cap = "台農57號黃金地瓜　鬆軟綿密"; name = "02_product.png" },
  @{ src = "$assets\c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_8376e309650b92fb678a1a73ad5bca0f_images_649975_0-316e9a3a-eb93-44c2-be95-0d7139c0d1c4.png"; cap = "輕鬆選購　自動計算運費"; name = "03_cart.png" },
  @{ src = "$assets\c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_8376e309650b92fb678a1a73ad5bca0f_images_649976_0-c0986a5a-7f48-4fe7-8c53-c09512ce606a.png"; cap = "快速結帳　多元通知方式"; name = "04_checkout.png" }
)

$W = 1080
$H = 1920

function New-RoundedPath([int]$x,[int]$y,[int]$w,[int]$h,[int]$r){
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

foreach($it in $items){
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

  # background gradient (cream -> warm orange)
  $rect = New-Object System.Drawing.Rectangle(0,0,$W,$H)
  $c1 = [System.Drawing.Color]::FromArgb(253,241,224)  # cream
  $c2 = [System.Drawing.Color]::FromArgb(240,180,120)  # warm orange
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 90.0)
  $g.FillRectangle($brush, $rect)
  $brush.Dispose()

  # caption text at top
  $capFont = New-Object System.Drawing.Font("Microsoft JhengHei", 40, [System.Drawing.FontStyle]::Bold)
  $capBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90,45,10))
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $capRect = New-Object System.Drawing.RectangleF(60, 55, ($W-120), 150)
  $g.DrawString($it.cap, $capFont, $capBrush, $capRect, $sf)

  # load screenshot
  $shot = [System.Drawing.Image]::FromFile($it.src)
  $sw = $shot.Width
  $sh = $shot.Height

  # target area for screenshot (below caption)
  $areaTop = 240
  $areaBottom = $H - 70
  $areaH = $areaBottom - $areaTop
  $areaW = $W - 160
  # scale to fit
  $scale = [Math]::Min($areaW / $sw, $areaH / $sh)
  $dw = [int]($sw * $scale)
  $dh = [int]($sh * $scale)
  $dx = [int](($W - $dw) / 2)
  $dy = [int]($areaTop + ($areaH - $dh) / 2)

  # drop shadow
  $shadowPath = New-RoundedPath ($dx+8) ($dy+10) $dw $dh 28
  $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60,60,30,10))
  $g.FillPath($shadowBrush, $shadowPath)
  $shadowBrush.Dispose()
  $shadowPath.Dispose()

  # clip to rounded rect and draw screenshot
  $clip = New-RoundedPath $dx $dy $dw $dh 28
  $g.SetClip($clip)
  $g.DrawImage($shot, $dx, $dy, $dw, $dh)
  $g.ResetClip()
  # border
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255,255,255), 3)
  $g.DrawPath($pen, $clip)
  $pen.Dispose()
  $clip.Dispose()

  $shot.Dispose()

  $dest = Join-Path $out $it.name
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  "saved $dest"
}


