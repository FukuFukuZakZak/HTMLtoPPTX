# Beta startup modes: implementation and acceptance

## Final result — 2026-09-07

Implemented the user's selected WebView2 standalone and fixed-port Web startup modes. All local acceptance checks pass. Distribution is `dist/HTMLtoPPTX-beta-20260907-windows-x64.zip`; source build is `scripts/build-windows.ps1`. Deployment and target-server checks are in [BETA-DEPLOYMENT.md](BETA-DEPLOYMENT.md). Published at user request on 2026-09-08 JST as v0.1.0-beta.1, product commit bb00e1fb4858653be14f099bf2390b092d02476f. Fresh release download matches the tested ZIP SHA-256 below. Release: https://github.com/divine261402-pixel/HTMLtoPPTX/releases/tag/v0.1.0-beta.1

- First launch opens an owned WebView2 window at 127.0.0.1 with an automatic port. Explicit standalone port is supported. Main-window close closes owned help, exits EXE and releases listeners/lock; repeated launch activates the existing deployment. Reload/minimize do not terminate it.
- Settings save atomically and apply next process start. Web chooses an assigned IPv4 automatically or explicitly and uses fixed configurable port 8080 by default. Port collision is an error, never an automatic fallback. Web has no native/browser window, survives client closure and supports Task Scheduler. `--background` requires configured Web mode.
- GUI subsystem suppresses console windows. `--config`, `--configure` and `--stop` support managed deployment. Local-only administration uses a separate loopback listener in Web mode with Host/Origin/token checks. Remote clients cannot change startup settings.
- Standalone uses the go-webview2 v1.0.23 loader plus a narrow local COM adapter; generated wrapper init callback/argument incompatibilities were avoided. Runtime 152.0.4191.66 was verified. Offline WebView2 installation is documented; Web-only servers do not require it.

## Final verification

- `go test ./...`: pass, 1.281s; `go vet ./...`: pass. Tests include real process locks/crash recovery, deferred mode changes, fixed-port collisions and save failure preserving existing configuration.
- `npm test`: 46/46, 0.310s. Edge `scripts/startup-acceptance.cjs`: six standard/8bit desktop/mobile layouts, validation/reload/focus, admin isolation, actual PPTX ZIP and GUI PE subsystem pass. Evidence `.tmp/startup-final/`.
- `scripts/desktop-acceptance.cjs dist/beta-startup-20260907/HTMLtoPPTX.exe` with `DESKTOP_OUTPUT_DIR=.tmp/desktop-final`: actual native Worker conversion/ZIP, help popup ownership, duplicate reuse, main-close process/listener removal and next-start Web behavior pass. Web browser close leaves server running; `--stop` exits cleanly. Evidence `.tmp/desktop-final/verification.json`.
- `scripts/scheduler-acceptance.ps1`: actual temporary Task Scheduler job passes fixed-port HTTP startup, unrelated working directory, no window and clean stop. Interactive logon tested; task removed. Target unattended account and reboot remain for internal acceptance.
- EXE SHA-256 `8C94C7C62C7CB39CEFE677FC9B2D77FE5650AAA1EC61ED6D534DE44929F819C1`.
- Distribution ZIP: 9,771,164 bytes; SHA-256 `81EFFC627842DCA49F54BDCA159C1A5E859B97FDF97B8E189252A738A19B6BDD`. All archived file hashes checked against the included manifest; no configuration/runtime metadata, logs or lock files shipped. Combined video: H.264, 1280×900, 28.92 seconds; sample frames inspected.
- `graphify update .`: 1048 nodes / 2561 edges / 59 communities. Existing generated JSON evidence yields three zero-node notices; community labels use hub fallbacks. No application impact.
- Requested recording captures actual native WebView2 content (5 fps) and an Edge Web client. Native window close is validated separately via standard WM_CLOSE/exit assertions; the video does not claim to show process inspection or OS chrome. Windows Firewall confirmation was dismissed by the user; no firewall rules were changed. Earlier desktop-capture attempts are excluded from distribution.
- Documentation sources: Context7 WebView2 native lifecycle/runtime/new-window, Playwright connectOverCDP/video/download, FFmpeg capture/encoding, Win32 CreateFile, MDN lifecycle; official pinned go-webview2 source and Microsoft Task Scheduler cmdlets used where exact Context7 documentation was unavailable. SDK 1.0.3800.47 WebView2.h confirms interface IIDs. See PROJECT_STATUS.md Verification.

## Remaining environment checks

Use the deployment guide for actual server-account unattended/reboot operation, client-to-server firewall/NIC access, target WebView2 and PowerPoint. This beta is managed-intranet HTTP without application login. Automatic IP selection cannot infer which of several valid NICs is the intended intranet; explicit IP or DHCP reservation gives a stable shared URL. Appearance is origin-scoped and may reset if the standalone automatic port changes. No known local startup acceptance failures remain.

## Historical assessment and intermediate foundation (superseded)

The following records the earlier assessment before the user selected WebView2. Its pending-state statements are historical and are superseded by the final result above.

Date: 2026-09-07
State: shared startup/configuration foundation implemented and verified locally; standalone lifecycle choice remains pending. Not a shipment-ready beta.

User follow-up: Web mode will use a fixed port. Proposed default: 8080, editable; collision is a startup error. Standalone retains automatic/explicit port selection.

## Resume implementation (2026-09-07)

User asked to resume. Implemented shared pieces independent of the lifecycle choice:

- startup_config.go: strict settings validation, defaults, replacement saves, network candidates and explicit IP/port binding.
- startup_windows.go: exclusive OS file handle across logon sessions; hidden browser helper and startup error dialog.
- startup_runtime.go and main.go: persisted startup modes, same-config duplicate reuse, crash recovery, local administration capability, separate loopback management listener for Web, active-versus-saved configuration, bounded logs, --config/--configure/--stop/--background. Web uses fixed default 8080 and never automatically opens a browser.
- web/startup.js, web/startup.css and web/index.html: startup settings integrated in the existing settings dialog. Remote/ordinary browser sessions lack the administrative capability. Local admin token is stripped from the address bar and held in sessionStorage. Server validates locality, Host, Origin and token for administration.
- scripts/build-windows.ps1: Windows GUI subsystem build. scripts/startup-acceptance.cjs and startup_test.go provide focused acceptance.

Verification: Go tests and vet pass; 46 existing JS tests pass. Process tests cover independent working directory, initial standalone, duplicate reuse, crash/restart, deferred configuration, real Web binding and remote admin denial. Edge passed six settings layouts (1440/1280/390 widths, standard/8bit), form validation, save/reload/focus return, guest denial and real PPTX ZIP download. PE subsystem is Windows GUI. Evidence: .tmp/startup-acceptance/verification.json and screenshots; intermediate EXE: .tmp/beta-startup-review/HTMLtoPPTX.exe. Graphify update: 932 nodes / 2309 edges / 51 communities; zero-node notices concern existing generated JSON evidence.

Remaining: user response to the normal-browser grace-period vs WebView2 question, then implementation/verification of standalone automatic exit, explicit Exit UX, launch timeout, help/multiple-tabs/reload/crash/sleep behavior, fixed-port conflict and save-failure cases, noninteractive Task Scheduler procedure/verification, final documentation and beta artifact. Current standalone still waits for explicit stop/signal; do not distribute the intermediate EXE as complete. No commit, push or release update performed.

Context7 additions: /websites/learn_microsoft_en-us_windows_win32_api for exclusive CreateFile/CloseHandle, /mdn/content for EventSource lifecycle assessment, /microsoft/playwright for Edge/form/download acceptance. Modern Web Guidance forms and Go Testing skills applied. No dependency added.

## Request and verified baseline

The user requests one Windows EXE with persisted standalone/web startup modes, no console window, initial standalone startup, settings taking effect only on the next process start, and prevention of duplicate standalone processes. Standalone binds 127.0.0.1 with automatic or explicit port and exits after the browser closes. Web defaults to automatic machine IP and port, supports explicit values, runs from Task Scheduler and survives client disconnects.

Verified at HEAD 4061c49: main.go binds 127.0.0.1:0, opens the default browser via rundll32, waits for OS signals and has no startup configuration or instance lock. newHandler serves embedded files with existing CSP. Conversion uses a browser Worker and Blob downloads. Appearance preferences use origin-scoped localStorage; they cannot hold executable startup configuration. Existing user-owned working-tree changes are .codex/config.toml, .codex-remote-attachments/, docs/ and test-data/.

## Feasibility and proposed behavior

- Both modes, saved IP/port settings, next-start application, GUI-subsystem EXE and a browser-independent Web process are feasible.
- One EXE is sufficient. Persist startup settings in an explicit file next to the EXE, with a configurable absolute path for managed deployments. Resolve paths from the EXE/config location, never the Task Scheduler working directory. Report read-only/invalid configuration rather than silently discarding it. Protect settings and log files with appropriate filesystem permissions.
- Keep active configuration separate from saved next-start configuration. Saving Web mode from an initial standalone session must not disable that session's standalone shutdown behavior. Web-to-standalone changes require stopping/restarting the scheduled process, not closing a client browser.
- Duplicate prevention must be independent of browser lifetime, using an OS-held lock with explicit deployment scope. A second standalone launch should reuse the existing instance; stale metadata must not keep an application locked after a crash. Web re-launches must not create an additional server.
- Web automatic IP selection needs a documented deterministic rule and visible selected address. Multiple adapters/VPNs can prevent reliable inference of the intended intranet network. Do not silently expose all interfaces as a substitute for selecting an address; allow explicit selection.
- Per user follow-up, Web uses a fixed configurable port; propose 8080 as the default. Do not include Web automatic-port selection. Occupied ports fail clearly rather than silently changing a published URL. Record the actual URL in a local status file/log. Standalone retains automatic/explicit port selection. Automatic IP remains requested; stable shared URLs also require a stable server address or managed DNS name.
- Restrict server startup settings to local administration; ordinary remote users should not change the shared server's startup mode/IP/port. Use request-origin/host validation and an administrative capability as appropriate, not a hidden button alone.
- Build with the Windows GUI subsystem and hide any helper processes. Provide bounded file logs and actionable local startup errors because stdout will no longer be visible. Task Scheduler deployments must not require a dialog or open a browser; document boot trigger, noninteractive account, no parallel instances, restart policy and removal of execution time limits.

## Lifecycle choice to present before implementation

1. Keep the usual browser (smaller beta change): track application-tab connections; after all are gone, exit after a documented grace period. Reload/reconnection must cancel shutdown. Add explicit Exit as a reliable user action. Handle initial browser-launch failure, multiple tabs, browser crash, sleep/resume and conversion activity. This is connection-loss detection, not proof the user closed a window. Discarded/frozen tabs or network interruption can resemble closure; unload events and short heartbeat timers alone are insufficient.
2. Use an owned native window hosting WebView2 when strict window-close/process-exit coupling is required. The native window lifetime can control the local server directly. This adds runtime/deployment requirements and requires ZIP download, help/new-window and conversion regression verification. Do not silently replace the user's normal browser workflow or assume the offline managed machines have the required Runtime.

The user expressly asked for alternatives and unnecessary-work feedback before implementation. Ask which lifecycle contract is desired; the Web side has no browser-lifetime ambiguity. A Windows Service is optional future operations work, not necessary for the requested Task Scheduler beta.

## Planned acceptance checks

- Fresh launch: standalone, loopback only, automatic port, no console window.
- Explicit/automatic ports, occupied/invalid port, missing IP, multiple adapters, corrupt/read-only config and logs.
- Save then close/restart in both directions; active mode remains unchanged until restart; scheduled account reads the same configured file regardless of current directory.
- Repeated/concurrent launch, restart after crash, no duplicate listener/process; existing application session is usable.
- Chosen lifecycle: close, reload, several tabs, launch failure, crash, background/discard and sleep/resume, conversion and help behavior.
- Web: browser not launched, clients disconnect without stopping server, remote clients cannot modify startup settings, actual selected URL discoverable.
- GUI-subsystem executable metadata and real Windows launch; Task Scheduler recipe exercised where available, remaining target-server checks explicitly identified.
- Existing Go/JS tests and real conversion/download smoke tests; retain Worker and CSP behavior over the intranet origin.

## Evidence consulted

- Serena main/openBrowser/newHandler symbols and focused searches of web/app.js and web/theme.js; no product changes or acceptance tests made during this assessment.
- Context7 /mdn/content: beforeunload/pagehide/unload reliability. https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event and https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
- Go linker GUI subsystem: https://go.dev/cmd/link/
- WebView2 deployment/runtime requirements: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution
