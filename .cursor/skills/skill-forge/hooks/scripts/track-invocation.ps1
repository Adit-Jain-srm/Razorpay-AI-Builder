# Track skill invocations for RL feedback
# This hook fires after tool use to detect when skill-forge skills are being used
# It updates rl-state.json with usage signals

param($ToolName, $ToolInput, $ToolOutput)

$memoryDir = Join-Path $PSScriptRoot ".." "memory"
$rlStatePath = Join-Path $memoryDir "rl-state.json"

if (-not (Test-Path $rlStatePath)) { return }

# Detect if a skill-forge skill was just used
$skillForgeSkills = @("mcp-conductor", "web-perf", "git-workflow", "db-schema", "arch-from-code", "error-resilience", "setup")

foreach ($skill in $skillForgeSkills) {
    if ($ToolInput -match $skill -or $ToolOutput -match $skill) {
        $rlState = Get-Content $rlStatePath | ConvertFrom-Json
        if (-not $rlState.usage_signals) {
            $rlState | Add-Member -NotePropertyName "usage_signals" -NotePropertyValue @() -Force
        }
        $signal = @{
            skill = $skill
            timestamp = (Get-Date).ToString("o")
            tool = $ToolName
        }
        $rlState.usage_signals += $signal
        $rlState | ConvertTo-Json -Depth 10 | Set-Content $rlStatePath
        break
    }
}
