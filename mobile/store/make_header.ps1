Add-Type -AssemblyName System.Drawing

$icon = "C:\Users\User\Desktop\sweetpotato\mobile\assets\icon\app_icon.png"
$dst  = "C:\Users\User\Desktop\sweetpotato\mobile\store\developer-header-4096x2304.png"

$W = 4096
$H = 2304

$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# diagonal warm gradient background
$rect = New-Object System.Drawing.Rectangle(0,0,$W,$H)
$c1 = [System.Drawing.Color]::FromArgb(253,240,222)   # cream (top-left)
$c2 = [System.Drawing.Color]::FromArgb(232,132,42)     # warm orange (bottom-right)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 35.0)
$g.FillRectangle($brush, $rect)
$brush.Dispose()

# soft radial-ish highlight behind icon (lighter circle on right)
$hl = New-Object System.Drawing.Drawing2D.GraphicsPath
$hl.AddEllipse(2450, 500, 1500, 1500)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($hl)
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(70,255,255,255)
$pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0,255,255,255))
$g.FillPath($pgb, $hl)
$pgb.Dispose(); $hl.Dispose()

# sweet potato icon on the right, with drop shadow
$img = [System.Drawing.Image]::FromFile($icon)
$size = 1250
$ix = 2560
$iy = [int](($H - $size) / 2)
# shadow
$shadow = New-Object System.Drawing.Drawing2D.GraphicsPath
$shadow.AddEllipse(($ix+40), ($iy+70), $size, $size)
$sb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70,80,40,10))
$g.FillPath($sb, $shadow)
$sb.Dispose(); $shadow.Dispose()
$g.DrawImage($img, $ix, $iy, $size, $size)
$img.Dispose()

# Title text (left area)
$titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(74,38,10))
$titleFont = New-Object System.Drawing.Font("Microsoft JhengHei", 200, [System.Drawing.FontStyle]::Bold)
$g.DrawString("磐石烤地瓜", $titleFont, $titleBrush, 300, 820)

# Tagline
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150,70,20))
$subFont = New-Object System.Drawing.Font("Microsoft JhengHei", 78, [System.Drawing.FontStyle]::Regular)
$g.DrawString("番薯阿嬤的溫暖滋味 · 炭火慢烤", $subFont, $subBrush, 320, 1180)

$bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

$o = [System.Drawing.Image]::FromFile($dst)
"saved {0}: {1} x {2}" -f $dst, $o.Width, $o.Height
$o.Dispose()

