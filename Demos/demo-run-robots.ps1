$env:UIPATH_URL = "https://staging.uipath.com"
$folder = "Shared"
$noise = "Tool factory|uip.ps1|CategoryInfo|FullyQualified|node\.exe|^\+|^\s*~"
$out = "c:\Users\steurma\Documents\new-project\uipath-maestro-test\MaestroCase\demo-results.txt"
"=== RPA DEMO RUN (CMP-1003 warm-vaccine -> destroy + credit) ===" | Out-File $out -Encoding utf8

$robots = @(
  @{ name="LookupSalesOrder";   key="DA4E3C66-F070-4FAA-94DE-42FF21018CB6"; args='{\"in_OrderNo\":\"SO-4004\"}' },
  @{ name="GatherEvidence";     key="D41DAE90-5DAE-4D6F-B61D-3AFB63A5320E"; args='{\"in_OrderNo\":\"SO-4004\"}' },
  @{ name="SetBatchQuarantine"; key="5820DEC8-CD4C-4C97-A6FA-809E1EFEE2FA"; args='{\"in_BatchNo\":\"P004-B01\"}' },
  @{ name="ExecuteDisposition"; key="96E48BC6-7D85-47FD-BAF6-BB484B14549F"; args='{\"in_BatchNo\":\"P004-B01\",\"in_TargetStatus\":\"Blocked\"}' },
  @{ name="PostToErp";          key="9BBB4375-5322-46D0-A238-154499172103"; args='{\"in_NoteType\":\"CREDIT\",\"in_CaseId\":\"CMP-1003\",\"in_CustomerCode\":\"C006\",\"in_ProductCode\":\"P004\",\"in_BatchNo\":\"P004-B01\",\"in_Qty\":\"50\",\"in_Amount\":\"1250.00\",\"in_Reason\":\"GDP 6.3 destroy - full credit\"}' },
  @{ name="IssueReversingNote"; key="54F45413-724E-496C-976D-64E12D4B2290"; args='{\"in_NoteType\":\"DEBIT\",\"in_CaseId\":\"CMP-1003\",\"in_CustomerCode\":\"C006\",\"in_ProductCode\":\"P004\",\"in_BatchNo\":\"P004-B01\",\"in_Qty\":\"50\",\"in_Amount\":\"1250.00\"}' }
)

foreach ($r in $robots) {
  $line = "`n>>> $($r.name) ..."
  $line | Out-File $out -Append -Encoding utf8
  $start = uip or jobs start $r.key --folder-path $folder --input-arguments $r.args --output json 2>$null | Select-String -NotMatch $noise | Out-String | ConvertFrom-Json
  $jk = $start.Data.Jobs[0].Key
  $state = "Pending"
  for ($i=0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 6
    $j = uip or jobs get $jk --output json 2>$null | Select-String -NotMatch $noise | Out-String | ConvertFrom-Json
    $state = $j.Data.State
    if ($state -notin @("Pending","Running")) { break }
  }
  $info = if ($j.Data.Info) { ($j.Data.Info -split "`n")[0] } else { "" }
  "    $($r.name): $state  $info" | Out-File $out -Append -Encoding utf8
  if ($j.Data.OutputArguments) { "    out: $($j.Data.OutputArguments)" | Out-File $out -Append -Encoding utf8 }
}
"`n=== DEMO COMPLETE ===" | Out-File $out -Append -Encoding utf8
Get-Content $out
