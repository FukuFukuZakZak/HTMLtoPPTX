"use strict";
// Native WebView2 acceptance. Requires Playwright, JSZip and FFmpeg.
// Video captures the actual WebView2 content, excluding other desktop windows.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const net = require("node:net");
const {spawn, execFileSync} = require("node:child_process");
const {chromium} = require("playwright");
const JSZip = require("jszip");
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const out = path.resolve(process.env.DESKTOP_OUTPUT_DIR || ".tmp/desktop-acceptance");
const report = {checks:[], errors:[], videos:[]};
const children = [];
const ps = code => execFileSync("powershell.exe",["-NoProfile","-Command",code],{windowsHide:true,encoding:"utf8"});
const launch = (exe,args,env={}) => { const p=spawn(exe,args,{windowsHide:false,stdio:"ignore",env:{...process.env,...env}});p.completion=new Promise(r=>p.once("exit",(code,signal)=>r({code,signal})));children.push(p);return p; };
async function until(fn, label, timeout=15000) {const end=Date.now()+timeout;while(Date.now()<end){try{const result=await fn();if(result)return result;}catch{}await sleep(100);}throw Error("Timed out: "+label);}
async function freePort() {const s=net.createServer();await new Promise(r=>s.listen(0,"127.0.0.1",r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function exited(p) {const result=await Promise.race([p.completion,sleep(12000).then(()=>{throw Error("process remains: "+p.pid);})]);assert.equal(result.code,0);}
function nativeClose(p) {
  // Process.CloseMainWindow sends the standard WM_CLOSE to the native owner.
  // No force kill, server stop endpoint, browser close event or focus emulation.
  assert.equal(ps(`(Get-Process -Id ${p.pid}).CloseMainWindow()`).trim(),"True");
}
async function record(p,name,page) {
  const file=path.join(out,name+".mp4");
  const ff=spawn("ffmpeg",["-y","-hide_banner","-loglevel","warning","-f","image2pipe","-framerate","5","-i","pipe:0","-vf","pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p","-c:v","libx264","-preset","veryfast","-crf","20","-movflags","+faststart",file],{windowsHide:true,stdio:["pipe","ignore","pipe"]});
  let log="";ff.stderr.on("data",d=>log+=d);const done=new Promise(r=>ff.once("exit",r));
  ff.stdin.on("error",()=>{});let running=true,frames=0;
  const capturing=(async()=>{while(running&&!page.isClosed()){const start=Date.now();try{ff.stdin.write(await page.screenshot({type:"jpeg",quality:85,timeout:3000}));frames++;}catch{break;}await sleep(Math.max(0,200-(Date.now()-start)));}})();
  return async()=>{running=false;await capturing;ff.stdin.end();await Promise.race([done,sleep(7000).then(()=>ff.kill())]);await fs.writeFile(path.join(out,name+"-capture.log"),log);assert.ok(frames>5);assert.ok((await fs.stat(file)).size>10000);report.videos.push(name+".mp4");};
}
(async()=>{
 await fs.mkdir(out,{recursive:true});const dir=await fs.mkdtemp(path.join(out,"run-"));const config=path.join(dir,"設定.json");
 const exe=path.resolve(process.argv[2]);let browser,info,stopRecording;
 const port=await freePort();const env={HTMLTOPPTX_WEBVIEW_DEBUG:"1",HTMLTOPPTX_WEBVIEW_ARGS:`--remote-debugging-port=${port}`};
 try {
  let p=launch(exe,["--config",config],env);
  info=await until(async()=>JSON.parse(await fs.readFile(config+".runtime.json","utf8")),"runtime metadata");
  browser=await until(()=>chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:1000}),"WebView2");
  const context=browser.contexts()[0];const page=await until(()=>context.pages().find(p=>p.url().startsWith(info.controlURL)),"main page");
  page.on("pageerror",e=>report.errors.push(e.message));await page.locator("#open-editor-button").waitFor();
  await page.waitForFunction(()=>!document.getElementById("startup-settings").hidden);
  stopRecording=await record(p,"01-standalone",page);
  report.checks.push("fresh native standalone loopback window");await sleep(1500);
  const duplicate=launch(exe,["--config",config]);await exited(duplicate);
  assert.equal(JSON.parse(await fs.readFile(config+".runtime.json","utf8")).pid,p.pid);assert.equal(context.pages().length,1);
  report.checks.push("duplicate exits and original process/window remains");
  await page.locator("#open-settings-button").click();await sleep(1500);
  assert.equal(await page.locator('input[name="startup-mode"]:checked').inputValue(),"standalone");
  await page.keyboard.press("Escape");await page.reload();await page.locator("#open-editor-button").click();
  await page.locator("#html-editor").fill('<!doctype html><html><head><title>WebView2検証</title></head><body><section class="slide" style="width:1280px;height:720px;background:#f3f1eb;padding:80px"><h1>WebView2 検証</h1><p>専用画面から PowerPoint に変換します。</p></section></body></html>');
  await sleep(2000);await page.locator("#editor-convert-button").click();await page.locator("#editor-download-link").waitFor({state:"visible"});await sleep(1500);
  const downloading=page.waitForEvent("download",{timeout:15000});await page.locator("#editor-download-link").click();const download=await downloading;
  const zipfile=path.join(out,"WebView2検証.zip");await download.saveAs(zipfile);const zip=await JSZip.loadAsync(await fs.readFile(zipfile));
  assert.ok(Object.keys(zip.files).some(p=>p.endsWith(".pptx")));report.checks.push("native WebView2 Worker conversion and actual ZIP download");
  await page.screenshot({path:path.join(out,"native-conversion.png")});await sleep(1800);
  const help=page.locator('#howtouse-link');await help.click();
  const helper=await until(()=>context.pages().find(p=>p.url().includes("/howtouse/")),"owned help window");await helper.waitForLoadState();
  report.checks.push("bundled help opens in owned native window");await sleep(1500);
  // Native close of the main owner also closes the owned help window.
  nativeClose(p);await exited(p);await stopRecording();stopRecording=null;
  assert.equal(await fs.access(config+".runtime.json").then(()=>true,()=>false),false);
  assert.equal(await fetch(info.controlURL+"/api/runtime").then(()=>true,()=>false),false);
  report.checks.push("native main close removes metadata and stops server/process, including owned help");
  await browser.close().catch(()=>{});browser=null;
  p=launch(exe,["--config",config],env);info=await until(async()=>JSON.parse(await fs.readFile(config+".runtime.json","utf8")),"restart");
  browser=await until(()=>chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:1000}),"restart WebView2");
  const second=await until(()=>browser.contexts()[0].pages().find(p=>p.url().startsWith(info.controlURL)),"restarted main");await second.locator("#open-editor-button").waitFor();
  stopRecording=await record(p,"02-save-web-mode",second);
  await second.locator("#open-settings-button").click();await second.locator('input[name="startup-mode"][value="web"]').check();
  const fixed=await freePort();await second.locator("#web-port").fill(String(fixed));await sleep(1800);await second.locator("#save-startup").click();
  await second.waitForFunction(()=>document.getElementById("startup-result").textContent.startsWith("保存しました"));
  assert.equal(JSON.parse(await fs.readFile(config+".runtime.json","utf8")).mode,"standalone");await sleep(2200);
  nativeClose(p);await exited(p);await stopRecording();stopRecording=null;await browser.close().catch(()=>{});browser=null;
  p=launch(exe,["--background","--config",config]);info=await until(async()=>JSON.parse(await fs.readFile(config+".runtime.json","utf8")),"Web startup");
  assert.equal(info.mode,"web");assert.equal(new URL(info.url).port,String(fixed));assert.equal(ps(`(Get-Process -Id ${p.pid}).MainWindowHandle.ToInt64()`).trim(),"0");
  browser=await chromium.launch({channel:"msedge"});const webctx=await browser.newContext({recordVideo:{dir:out,size:{width:1280,height:720}},viewport:{width:1280,height:720}});const guest=await webctx.newPage();
  await guest.goto(info.url);await guest.locator("#open-editor-button").waitFor();await sleep(2200);await guest.locator("#open-settings-button").click();assert.ok(await guest.locator("#startup-settings").isHidden());await sleep(1800);
  const video=guest.video();await guest.close();await webctx.close();await video.saveAs(path.join(out,"03-web-client.webm"));report.videos.push("03-web-client.webm");await browser.close();browser=null;
  assert.ok((await fetch(info.url+"/api/runtime")).ok);assert.equal(p.exitCode,null);report.checks.push("restart applies fixed Web port; no server window; guest close keeps server running");
  const stop=launch(exe,["--config",config,"--stop"]);await exited(stop);await exited(p);report.checks.push("Web --stop exits cleanly");
  assert.deepEqual(report.errors,[]);
 } finally {
  if(stopRecording)await stopRecording().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  for(const p of children)if(p.exitCode===null)p.kill();
  await fs.writeFile(path.join(out,"verification.json"),JSON.stringify(report,null,2));
 }
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
