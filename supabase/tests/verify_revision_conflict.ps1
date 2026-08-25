$ErrorActionPreference = 'Stop'

$projectRef = 'yeamtarykhvoaoszzeag'
$keys = & 'C:\Program Files\nodejs\supabase.cmd' projects api-keys --project-ref $projectRef --reveal --output json | ConvertFrom-Json
$anonKey = ($keys | Where-Object name -eq 'anon' | Select-Object -First 1).api_key
$serviceKey = ($keys | Where-Object name -eq 'service_role' | Select-Object -First 1).api_key
$baseUrl = "https://$projectRef.supabase.co"
$adminHeaders = @{ apikey = $serviceKey; Authorization = "Bearer $serviceKey"; 'Content-Type' = 'application/json' }
$email = "revision-test-$([guid]::NewGuid().ToString('N').Substring(0, 10))@ghostwriter-staging.dev"
$password = "Staging!$([guid]::NewGuid().ToString('N').Substring(0, 16))"
$user = $null

try {
  $user = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/v1/admin/users" -Headers $adminHeaders -Body (@{ email = $email; password = $password; email_confirm = $true } | ConvertTo-Json)
  $login = { Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/v1/token?grant_type=password" -Headers @{ apikey = $anonKey; 'Content-Type' = 'application/json' } -Body (@{ email = $email; password = $password } | ConvertTo-Json) }
  $deviceA = & $login; $deviceB = & $login
  $storyId = [guid]::NewGuid().ToString(); $nodeId = [guid]::NewGuid().ToString()
  $payload = @{ p_story = @{ id = $storyId; user_id = $user.id; title = 'Device A'; description = ''; genre = 'Noir'; root_node_id = $nodeId; style_config = @{}; expected_revision = 0 }; p_nodes = @(@{ id = $nodeId; parent_node_id = $null; title = 'Root'; content = 'A wins'; author_type = 'HUMAN'; status = 'CANON_PATH'; depth = 0; word_count = 2; position_x = 0; position_y = 0 }); p_edges = @(); p_lore = @() } | ConvertTo-Json -Depth 8
  $headersA = @{ apikey = $anonKey; Authorization = "Bearer $($deviceA.access_token)"; 'Content-Type' = 'application/json' }
  $headersB = @{ apikey = $anonKey; Authorization = "Bearer $($deviceB.access_token)"; 'Content-Type' = 'application/json' }
  $revision = Invoke-RestMethod -Method Post -Uri "$baseUrl/rest/v1/rpc/sync_story_tree_v2" -Headers $headersA -Body $payload
  $rejected = $false
  try { Invoke-RestMethod -Method Post -Uri "$baseUrl/rest/v1/rpc/sync_story_tree_v2" -Headers $headersB -Body $payload | Out-Null } catch { $rejected = $true }
  if ($revision -ne 1 -or -not $rejected) { throw "Expected first revision 1 and stale-write rejection; got revision=$revision rejected=$rejected" }
  Write-Output 'PASS: revision 1 saved by device A; stale device B write rejected.'
} finally {
  if ($user) { Invoke-RestMethod -Method Delete -Uri "$baseUrl/auth/v1/admin/users/$($user.id)" -Headers $adminHeaders | Out-Null; Write-Output 'Cleanup complete.' }
}
