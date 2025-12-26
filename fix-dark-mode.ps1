$file = 'src\app\(app)\launch\page.tsx'
$content = Get-Content $file -Raw

$content = $content -replace 'text-gray-900','text-foreground'
$content = $content -replace 'text-gray-700','text-muted-foreground'
$content = $content -replace 'text-gray-600','text-muted-foreground'
$content = $content -replace 'bg-white(?!\/)',bg-card'
$content = $content -replace 'bg-gray-50','bg-muted'
$content = $content -replace 'bg-blue-50','bg-primary/10'
$content = $content -replace 'border-gray-300','border-border'
$content = $content -replace 'border-gray-200','border-border'
$content = $content -replace 'border-gray-100','border-border'
$content = $content -replace 'border-blue-200','border-primary/20'
$content = $content -replace 'border-blue-500','border-primary'
$content = $content -replace 'hover:border-blue-400','hover:border-primary'
$content = $content -replace 'hover:border-blue-300','hover:border-primary/60'
$content = $content -replace 'hover:bg-blue-50','hover:bg-primary/10'
$content = $content -replace 'hover:bg-gray-50','hover:bg-muted/50'

$content | Set-Content $file
Write-Host 'Dark mode colors updated successfully!' -ForegroundColor Green
