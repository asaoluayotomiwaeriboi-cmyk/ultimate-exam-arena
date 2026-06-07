$ErrorActionPreference = 'Continue'
$login = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method Post -Body (@{ email='student1@example.com'; password='student123' } | ConvertTo-Json) -ContentType 'application/json' -UseBasicParsing
$token = $login.token
Write-Output "Login token length: $($token.Length)"
$results = @()
for ($i=1; $i -le 10; $i++) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $body = @{ subjectCodes = @('MATH','PHY','CHEM'); mode = 'mock' } | ConvertTo-Json
  try {
    $res = Invoke-RestMethod -Uri 'http://localhost:5000/api/exams/start' -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $body -ContentType 'application/json' -UseBasicParsing
    $status = 'OK'
    $sid = $res.sessionId
  } catch {
    $status = "ERR: $($_.Exception.Response.StatusCode.Value__ -as [string] -or $_.Exception.Message)"
    $sid = 'ERR'
  }
  $sw.Stop()
  $ms = $sw.ElapsedMilliseconds
  $line = ('Iter {0}: {1} - {2}ms - session:{3}' -f $i,$status,$ms,$sid)
  Write-Output $line
  $results += $ms
  Start-Sleep -Milliseconds 200
}
$min = ($results | Measure-Object -Minimum).Minimum
$max = ($results | Measure-Object -Maximum).Maximum
$avg = [math]::Round(($results | Measure-Object -Average).Average,2)
Write-Output "Summary: min=${min}ms max=${max}ms avg=${avg}ms"
