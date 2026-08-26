param(
  [ValidatePattern('^[a-z]{20}$')]
  [string]$ProjectRef = 'yeamtarykhvoaoszzeag'
)

$ErrorActionPreference = 'Stop'
$PSDefaultParameterValues['Invoke-RestMethod:TimeoutSec'] = 30

$keys = & 'C:\Program Files\nodejs\supabase.cmd' projects api-keys --project-ref $ProjectRef --reveal --output json | ConvertFrom-Json
$anonKey = ($keys | Where-Object name -eq 'anon' | Select-Object -First 1).api_key
$serviceKey = ($keys | Where-Object name -eq 'service_role' | Select-Object -First 1).api_key
$baseUrl = "https://$ProjectRef.supabase.co"
$adminHeaders = @{ apikey = $serviceKey; Authorization = "Bearer $serviceKey"; 'Content-Type' = 'application/json' }
$suffix = [guid]::NewGuid().ToString('N').Substring(0, 10)
$emailA = "revision-a-$suffix@ghostwriter-verification.dev"
$emailB = "revision-b-$suffix@ghostwriter-verification.dev"
$passwordA = "Verify-A-$([guid]::NewGuid().ToString('N'))"
$passwordB = "Verify-B-$([guid]::NewGuid().ToString('N'))"
$userA = $null
$userB = $null

try {
  $userA = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/v1/admin/users" -Headers $adminHeaders -Body (@{ email = $emailA; password = $passwordA; email_confirm = $true } | ConvertTo-Json)
  $userB = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/v1/admin/users" -Headers $adminHeaders -Body (@{ email = $emailB; password = $passwordB; email_confirm = $true } | ConvertTo-Json)
  $loginA = { Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/v1/token?grant_type=password" -Headers @{ apikey = $anonKey; 'Content-Type' = 'application/json' } -Body (@{ email = $emailA; password = $passwordA } | ConvertTo-Json) }
  $deviceA = & $loginA
  $deviceB = & $loginA
  $accountB = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/v1/token?grant_type=password" -Headers @{ apikey = $anonKey; 'Content-Type' = 'application/json' } -Body (@{ email = $emailB; password = $passwordB } | ConvertTo-Json)
  $storyId = [guid]::NewGuid().ToString(); $nodeId = [guid]::NewGuid().ToString()
  $payloadObject = @{ p_story = @{ id = $storyId; user_id = $userA.id; title = 'Device A'; description = ''; genre = 'Noir'; root_node_id = $nodeId; style_config = @{}; expected_revision = 0 }; p_nodes = @(@{ id = $nodeId; parent_node_id = $null; title = 'Root'; content = 'A wins'; author_type = 'HUMAN'; status = 'CANON_PATH'; depth = 0; word_count = 2; position_x = 0; position_y = 0 }); p_edges = @(); p_lore = @() }
  $payload = $payloadObject | ConvertTo-Json -Depth 8
  $headersA = @{ apikey = $anonKey; Authorization = "Bearer $($deviceA.access_token)"; 'Content-Type' = 'application/json' }
  $headersB = @{ apikey = $anonKey; Authorization = "Bearer $($deviceB.access_token)"; 'Content-Type' = 'application/json' }
  $headersOther = @{ apikey = $anonKey; Authorization = "Bearer $($accountB.access_token)"; 'Content-Type' = 'application/json' }
  $revision = Invoke-RestMethod -Method Post -Uri "$baseUrl/rest/v1/rpc/sync_story_tree_v2" -Headers $headersA -Body $payload
  $rejected = $false
  try { Invoke-RestMethod -Method Post -Uri "$baseUrl/rest/v1/rpc/sync_story_tree_v2" -Headers $headersB -Body $payload | Out-Null } catch { $rejected = $true }
  if ($revision -ne 1 -or -not $rejected) { throw "Expected first revision 1 and stale-write rejection; got revision=$revision rejected=$rejected" }

  $otherResult = Invoke-RestMethod -Method Get -Uri "$baseUrl/rest/v1/stories?id=eq.$storyId&select=id" -Headers $headersOther
  $anonymousResult = Invoke-RestMethod -Method Get -Uri "$baseUrl/rest/v1/stories?id=eq.$storyId&select=id" -Headers @{ apikey = $anonKey; Authorization = "Bearer $anonKey" }
  $otherView = @($otherResult)
  $anonymousView = @($anonymousResult)
  if ($otherView.Count -ne 0 -or $anonymousView.Count -ne 0) { throw "RLS exposed a private story: other=$($otherView.Count) anonymous=$($anonymousView.Count)" }

  $crossOwnerRejected = $false
  try { Invoke-RestMethod -Method Post -Uri "$baseUrl/rest/v1/rpc/sync_story_tree_v2" -Headers $headersOther -Body $payload | Out-Null } catch { $crossOwnerRejected = $true }
  if (-not $crossOwnerRejected) { throw 'Cross-owner story synchronization was accepted' }

  $payloadObject.p_story.expected_revision = 1
  $payloadObject.p_nodes[0].content = ''.PadRight(100001, 'x')
  $oversizedRejected = $false
  try { Invoke-RestMethod -Method Post -Uri "$baseUrl/rest/v1/rpc/sync_story_tree_v2" -Headers $headersA -Body ($payloadObject | ConvertTo-Json -Depth 8) | Out-Null } catch { $oversizedRejected = $true }
  if (-not $oversizedRejected) { throw 'Oversized chapter content was accepted' }

  $storedResult = Invoke-RestMethod -Method Get -Uri "$baseUrl/rest/v1/stories?id=eq.$storyId&select=id,title,revision" -Headers $headersA
  $stored = @($storedResult)
  if ($stored.Count -ne 1 -or $stored[0].revision -ne 1 -or $stored[0].title -ne 'Device A') { throw 'Rejected writes changed the saved story' }

  Write-Output "PASS: $ProjectRef revision conflict, RLS isolation, cross-owner rejection, and payload limits verified."
} finally {
  if ($userA) { Invoke-RestMethod -Method Delete -Uri "$baseUrl/auth/v1/admin/users/$($userA.id)" -Headers $adminHeaders | Out-Null }
  if ($userB) { Invoke-RestMethod -Method Delete -Uri "$baseUrl/auth/v1/admin/users/$($userB.id)" -Headers $adminHeaders | Out-Null }
  Write-Output 'Cleanup complete.'
}
