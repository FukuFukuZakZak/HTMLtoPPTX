$ErrorActionPreference = "Continue"

uv tool run --from code-review-graph==2.3.7 code-review-graph update
if ($LASTEXITCODE -ne 0) {
    Write-Warning "code-review-graph update failed; commit checks will continue."
}

uv tool run --from code-review-graph==2.3.7 code-review-graph detect-changes --brief
if ($LASTEXITCODE -ne 0) {
    Write-Warning "code-review-graph detect-changes failed; commit checks will continue."
}

exit 0
