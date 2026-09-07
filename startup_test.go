package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"
)

func TestStartupConfiguration(t *testing.T) {
	path := filepath.Join(t.TempDir(), "設定.json")
	c, err := loadConfig(path)
	if err != nil || c != defaultConfig() {
		t.Fatalf("fresh config: %+v %v", c, err)
	}
	for _, data := range []string{
		`{"mode":"bad"}`, `{"webPort":0}`, `{"webPort":65536}`, `{"standalonePort":-1}`,
		`{"webIP":"0.0.0.0"}`, `{"webIP":"127.0.0.1"}`, `{"webIP":"224.0.0.1"}`,
		`{"webIP":"example.test"}`, `{"typo":1}`, `{}`, `{} {}`, `null`,
	} {
		t.Run(data, func(t *testing.T) {
			if err := os.WriteFile(path, []byte(data), 0600); err != nil {
				t.Fatal(err)
			}
			_, err := loadConfig(path)
			// An empty object is intentionally backward-compatible with defaults.
			if data == `{}` {
				if err != nil {
					t.Fatal(err)
				}
				return
			}
			if err == nil {
				t.Fatal("invalid config accepted")
			}
		})
	}
	c = defaultConfig()
	c.Mode = "web"
	c.WebIP = "192.168.10.4"
	c.WebPort = 18080
	if err := writeJSON(path, c); err != nil {
		t.Fatal(err)
	}
	got, err := loadConfig(path)
	if err != nil || got != c {
		t.Fatalf("round trip: %+v %v", got, err)
	}
	if err := writeJSON(path, defaultConfig()); err != nil {
		t.Fatalf("replace existing settings: %v", err)
	}
}

func TestStartupListenSelection(t *testing.T) {
	ips := []machineIP{{Address: "192.168.10.4"}, {Address: "10.1.1.3"}}
	c := defaultConfig()
	if got, err := listenAddress(c, nil); err != nil || got != "127.0.0.1:0" {
		t.Fatalf("standalone: %s %v", got, err)
	}
	c.Mode = "web"
	if got, err := listenAddress(c, ips); err != nil || got != "192.168.10.4:8080" {
		t.Fatalf("auto IP: %s %v", got, err)
	}
	c.WebIP = "10.1.1.3"
	if got, err := listenAddress(c, ips); err != nil || got != "10.1.1.3:8080" {
		t.Fatalf("explicit IP: %s %v", got, err)
	}
	if _, err := listenAddress(c, nil); err == nil {
		t.Fatal("unassigned IP accepted")
	}
	c.WebIP = "auto"
	if _, err := listenAddress(c, nil); err == nil {
		t.Fatal("no interfaces accepted")
	}
}

func TestStartupSettingsAuthorizationAndDeferredSave(t *testing.T) {
	c := defaultConfig()
	a := &startupApp{active: c, saved: c, path: filepath.Join(t.TempDir(), "app.json"), info: runInfo{Token: strings.Repeat("a", 64)}, stop: make(chan struct{})}
	h := a.handler("127.0.0.1:19000")
	request := func(method, path, remote, host, origin, token, body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, "http://127.0.0.1:19000"+path, strings.NewReader(body))
		r.RemoteAddr = remote
		r.Host = host
		r.Header.Set("Origin", origin)
		r.Header.Set("X-App-Token", token)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	for _, tc := range []struct{ name, remote, host, origin, token string }{
		{"missing token", "127.0.0.1:1", "127.0.0.1:19000", "", ""},
		{"remote client", "192.168.1.5:1", "127.0.0.1:19000", "", a.info.Token},
		{"DNS rebinding", "127.0.0.1:1", "evil.test:19000", "", a.info.Token},
		{"cross origin", "127.0.0.1:1", "127.0.0.1:19000", "http://evil.test", a.info.Token},
	} {
		t.Run(tc.name, func(t *testing.T) {
			for _, route := range []string{"/api/startup", "/api/stop", "/api/ping", "/api/activate"} {
				if w := request("POST", route, tc.remote, tc.host, tc.origin, tc.token, `{}`); w.Code != 403 {
					t.Fatalf("%s: %d", route, w.Code)
				}
			}
		})
	}
	next := c
	next.StandalonePort = 19001
	body, _ := json.Marshal(next)
	w := request("POST", "/api/startup", "127.0.0.1:1", "127.0.0.1:19000", "http://127.0.0.1:19000", a.info.Token, string(body))
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if a.active != c || a.saved != next {
		t.Fatal("saving changed active mode or failed to update saved mode")
	}
	got, err := loadConfig(a.path)
	if err != nil || got != next {
		t.Fatalf("saved file: %+v %v", got, err)
	}
	for _, bad := range []string{`{}`, `null`, string(body) + ` {}`, strings.Repeat("x", 5000)} {
		if w := request("POST", "/api/startup", "127.0.0.1:1", "127.0.0.1:19000", "", a.info.Token, bad); w.Code != 400 {
			t.Fatal(w.Code, w.Body.String())
		}
		got, _ = loadConfig(a.path)
		if got != next {
			t.Fatal("bad request altered saved config")
		}
	}
	w = request("GET", "/api/runtime", "192.168.1.5:1", "server:8080", "", "", "")
	if w.Code != 200 || strings.Contains(w.Body.String(), a.info.Token) || strings.Contains(w.Body.String(), a.path) {
		t.Fatal("public status leaks administrative data")
	}
	// A sharing violation must leave both the persisted and in-memory settings intact.
	release, err := acquireInstance(a.path)
	if err != nil {
		t.Fatal(err)
	}
	body, _ = json.Marshal(c)
	w = request("POST", "/api/startup", "127.0.0.1:1", "127.0.0.1:19000", "", a.info.Token, string(body))
	release()
	if w.Code != 500 || a.saved != next || a.active != c {
		t.Fatal("failed save changed configuration", w.Code)
	}
	got, err = loadConfig(a.path)
	if err != nil || got != next {
		t.Fatal("failed save damaged previous file", err)
	}
}

func TestProcessFixedPortCollision(t *testing.T) {
	ips, _ := machineIPs()
	for _, mode := range []string{"standalone", "web"} {
		t.Run(mode, func(t *testing.T) {
			ip := "127.0.0.1"
			if mode == "web" {
				if len(ips) == 0 {
					t.Skip("no network adapter")
				}
				ip = ips[0].Address
			}
			listener, err := net.Listen("tcp4", ip+":0")
			if err != nil {
				t.Fatal(err)
			}
			defer listener.Close()
			port := listener.Addr().(*net.TCPAddr).Port
			c := defaultConfig()
			c.Mode, c.WebIP, c.WebPort, c.StandalonePort = mode, ip, port, port
			if mode == "standalone" {
				c.WebIP = "auto"
			}
			path := filepath.Join(t.TempDir(), "config.json")
			if err := writeJSON(path, c); err != nil {
				t.Fatal(err)
			}
			_, done := startTestProcess(t, path)
			select {
			case err := <-done:
				if err == nil {
					t.Fatal("occupied fixed port accepted")
				}
			case <-time.After(6 * time.Second):
				t.Fatal("collision did not terminate")
			}
			if _, err := os.Stat(path + ".runtime.json"); !errors.Is(err, os.ErrNotExist) {
				t.Fatal("collision left runtime metadata")
			}
			data, _ := os.ReadFile(path + ".log")
			if !strings.Contains(string(data), "ポート使用状況") {
				t.Fatal("missing actionable collision log")
			}
		})
	}
}

func TestDesktopNavigationBoundary(t *testing.T) {
	base := "http://127.0.0.1:19000/"
	for _, target := range []string{base, base + "howtouse/", base + "#fragment"} {
		if !sameDesktopOrigin(target, base) {
			t.Fatal("local navigation rejected", target)
		}
	}
	for _, target := range []string{"https://127.0.0.1:19000/", "http://127.0.0.1:19001/", "file:///C:/Windows/", "javascript:alert(1)", "http://user@127.0.0.1:19000/", "http://example.com/"} {
		if sameDesktopOrigin(target, base) {
			t.Fatal("external navigation accepted", target)
		}
	}
}

func TestExclusiveInstanceLock(t *testing.T) {
	path := filepath.Join(t.TempDir(), "instance.lock")
	release, err := acquireInstance(path)
	if err != nil {
		t.Fatal(err)
	}
	if second, err := acquireInstance(path); !errors.Is(err, errInstanceRunning) {
		if second != nil {
			second()
		}
		t.Fatalf("second lock: %v", err)
	}
	release()
	release, err = acquireInstance(path)
	if err != nil {
		t.Fatalf("stale lock file prevented restart: %v", err)
	}
	release()
}

func TestStartupChild(t *testing.T) {
	if os.Getenv("HTMLTOPPTX_TEST_CHILD") != "1" {
		return
	}
	err := runApplication([]string{"--config", os.Getenv("HTMLTOPPTX_TEST_CONFIG")})
	if err != nil {
		os.Exit(2)
	}
	os.Exit(0)
}

func startTestProcess(t *testing.T, path string) (*exec.Cmd, <-chan error) {
	t.Helper()
	cmd := exec.Command(os.Args[0], "-test.run=^TestStartupChild$")
	cmd.Dir = os.TempDir()
	cmd.Env = append(os.Environ(), "HTMLTOPPTX_TEST_CHILD=1", "HTMLTOPPTX_NO_BROWSER=1", "HTMLTOPPTX_TEST_CONFIG="+path)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	t.Cleanup(func() { cmd.Process.Kill() })
	return cmd, done
}

func readRunning(t *testing.T, path string) runInfo {
	t.Helper()
	deadline := time.Now().Add(6 * time.Second)
	for time.Now().Before(deadline) {
		data, err := os.ReadFile(path + ".runtime.json")
		var info runInfo
		if err == nil && json.Unmarshal(data, &info) == nil {
			return info
		}
		time.Sleep(30 * time.Millisecond)
	}
	logData, _ := os.ReadFile(path + ".log")
	t.Fatalf("server did not start: %s", logData)
	return runInfo{}
}

func TestProcessStartupRestartAndWebIsolation(t *testing.T) {
	path := filepath.Join(t.TempDir(), "起動 設定.json")
	first, done := startTestProcess(t, path)
	info := readRunning(t, path)
	if info.Mode != "standalone" || !strings.HasPrefix(info.URL, "http://127.0.0.1:") {
		t.Fatalf("fresh mode: %+v", info)
	}
	_, duplicate := startTestProcess(t, path)
	select {
	case err := <-duplicate:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(6 * time.Second):
		t.Fatal("duplicate process remained running")
	}
	if current := readRunning(t, path); current.PID != first.Process.Pid {
		t.Fatal("duplicate replaced original")
	}
	// A crash must release the OS lock; the surviving metadata is ignored.
	first.Process.Kill()
	<-done
	_, done = startTestProcess(t, path)
	deadline := time.Now().Add(6 * time.Second)
	for time.Now().Before(deadline) {
		info = readRunning(t, path)
		if info.PID != first.Process.Pid {
			break
		}
		time.Sleep(30 * time.Millisecond)
	}
	if info.PID == first.Process.Pid {
		t.Fatal("crash recovery failed")
	}
	client := &http.Client{Timeout: 3 * time.Second, Transport: &http.Transport{Proxy: nil}}
	defer client.CloseIdleConnections()
	post := func(url, token string, c startupConfig) int {
		body, _ := json.Marshal(c)
		req, _ := http.NewRequest("POST", url+"/api/startup", bytes.NewReader(body))
		req.Header.Set("X-App-Token", token)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			data, _ := io.ReadAll(resp.Body)
			t.Log(string(data))
		}
		return resp.StatusCode
	}
	ips, err := machineIPs()
	if err != nil || len(ips) == 0 {
		t.Skip("no network IPv4 for Web integration")
	}
	next := defaultConfig()
	next.Mode = "web"
	// Reserve and release an OS-chosen port; Web itself receives a fixed value.
	next.WebPort = freeTestPort(t, ips[0].Address)
	if code := post(info.ControlURL, info.Token, next); code != 200 {
		t.Fatal(code)
	}
	if info := readRunning(t, path); info.Mode != "standalone" {
		t.Fatal("mode changed without restart")
	}
	if err := useRunning(path, false, true, true); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(6 * time.Second):
		t.Fatal("stop timed out")
	}
	_, done = startTestProcess(t, path)
	info = readRunning(t, path)
	if info.Mode != "web" || !strings.HasSuffix(info.URL, ":"+fmt.Sprint(next.WebPort)) {
		t.Fatalf("web startup: %+v", info)
	}
	if code := post(info.URL, info.Token, next); code != 403 {
		t.Fatalf("remote Web settings accepted: %d", code)
	}
	resp, err := client.Get(info.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatal(resp.StatusCode)
	}
	client.CloseIdleConnections()
	if err := useRunning(path, false, false, true); err != nil {
		t.Fatal("web stopped with client", err)
	}
	if err := useRunning(path, false, true, true); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(6 * time.Second):
		t.Fatal("web stop timed out")
	}
}

func freeTestPort(t *testing.T, ip string) int {
	t.Helper()
	l, err := net.Listen("tcp4", ip+":0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}
