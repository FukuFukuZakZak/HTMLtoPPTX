package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

type runInfo struct {
	PID        int    `json:"pid"`
	Mode       string `json:"mode"`
	URL        string `json:"url"`
	ControlURL string `json:"controlURL"`
	Token      string `json:"token"`
}

type startupApp struct {
	mu       sync.Mutex
	active   startupConfig
	saved    startupConfig
	path     string
	info     runInfo
	stop     chan struct{}
	stopOnce sync.Once
	activate func()
}

func (a *startupApp) requestStop() { a.stopOnce.Do(func() { close(a.stop) }) }

func (a *startupApp) handler(controlHost string) http.Handler {
	static := newHandler()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") {
			static.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.URL.Path == "/api/runtime" && r.Method == http.MethodGet {
			json.NewEncoder(w).Encode(map[string]any{"mode": a.active.Mode, "url": a.info.URL})
			return
		}
		remote, _, err := net.SplitHostPort(r.RemoteAddr)
		origin := r.Header.Get("Origin")
		// Local IP alone is insufficient: require the exact control origin plus
		// a random per-process capability that is never exposed to Web clients.
		if err != nil || !net.ParseIP(remote).IsLoopback() || r.Host != controlHost ||
			(origin != "" && origin != "http://"+controlHost) || r.Header.Get("Sec-Fetch-Site") == "cross-site" ||
			subtle.ConstantTimeCompare([]byte(r.Header.Get("X-App-Token")), []byte(a.info.Token)) != 1 {
			http.Error(w, "起動設定は端末上の管理画面から操作してください", http.StatusForbidden)
			return
		}
		switch r.URL.Path {
		case "/api/activate":
			if r.Method != http.MethodPost {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return
			}
			a.mu.Lock()
			if a.activate != nil {
				a.activate()
			}
			a.mu.Unlock()
			json.NewEncoder(w).Encode(map[string]bool{"ok": true})
		case "/api/ping":
			if r.Method != http.MethodGet {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return
			}
			json.NewEncoder(w).Encode(map[string]any{"pid": a.info.PID, "mode": a.active.Mode})
		case "/api/startup":
			if r.Method == http.MethodGet {
				ips, err := machineIPs()
				if err != nil {
					http.Error(w, err.Error(), 500)
					return
				}
				a.mu.Lock()
				defer a.mu.Unlock()
				json.NewEncoder(w).Encode(map[string]any{"active": a.active, "saved": a.saved, "url": a.info.URL, "addresses": ips, "configPath": a.path})
			} else if r.Method == http.MethodPost {
				var c startupConfig
				d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
				d.DisallowUnknownFields()
				err := d.Decode(&c)
				var extra any
				if err == nil && d.Decode(&extra) != io.EOF {
					err = errors.New("設定データの末尾が不正です")
				}
				if err == nil {
					err = c.validate()
				}
				if err != nil {
					http.Error(w, err.Error(), http.StatusBadRequest)
					return
				}
				// Validate address assignment now; port availability is decided on
				// next start because the current process may own that same port.
				if c.Mode == "web" {
					ips, err := machineIPs()
					if err == nil {
						_, err = listenAddress(c, ips)
					}
					if err != nil {
						http.Error(w, err.Error(), http.StatusBadRequest)
						return
					}
				}
				a.mu.Lock()
				defer a.mu.Unlock()
				if err := writeJSON(a.path, c); err != nil {
					http.Error(w, "設定を保存できません: "+err.Error(), 500)
					return
				}
				a.saved = c
				json.NewEncoder(w).Encode(map[string]bool{"restartRequired": a.saved != a.active})
			} else {
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
		case "/api/stop":
			if r.Method != http.MethodPost {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return
			}
			json.NewEncoder(w).Encode(map[string]bool{"stopping": true})
			a.requestStop()
		default:
			http.NotFound(w, r)
		}
	})
}

func runApplication(args []string) (result error) {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	flags := flag.NewFlagSet("HTMLtoPPTX", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	configPath := flags.String("config", filepath.Join(filepath.Dir(exe), "HTMLtoPPTX.config.json"), "設定ファイルのパス")
	configure := flags.Bool("configure", false, "端末上の起動設定画面を開く")
	stop := flags.Bool("stop", false, "同じ設定の起動済みアプリを停止")
	background := flags.Bool("background", false, "Webサーバーとして無人起動（画面・エラーダイアログなし）")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if flags.NArg() != 0 || (*configure && *stop) {
		return errors.New("起動引数が不正です")
	}
	*configPath, err = filepath.Abs(*configPath)
	if err != nil {
		return err
	}
	if resolved, err := filepath.EvalSymlinks(filepath.Dir(*configPath)); err == nil {
		*configPath = filepath.Join(resolved, filepath.Base(*configPath))
	}
	noBrowser := *background || os.Getenv("HTMLTOPPTX_NO_BROWSER") == "1"
	showError := !noBrowser && !*stop
	defer func() {
		if result != nil && showError {
			showStartupError(result.Error() + "\n\n設定: " + *configPath + "\nログ: " + *configPath + ".log")
		}
	}()
	// Logging is bounded even for an indefinitely running scheduled process.
	logger := &rollingLog{path: *configPath + ".log"}
	if err := logger.check(); err != nil {
		return fmt.Errorf("ログを書き込めません（配置先の書込権限を確認してください）: %w", err)
	}
	log.SetOutput(logger)
	defer func() {
		if result != nil {
			log.Printf("起動エラー: %v", result)
		}
	}()
	release, err := acquireInstance(*configPath + ".lock")
	if errors.Is(err, errInstanceRunning) {
		return useRunning(*configPath, *configure, *stop, noBrowser)
	}
	if err != nil {
		return fmt.Errorf("起動ロックを取得できません: %w", err)
	}
	defer release()
	if *stop {
		return errors.New("停止するアプリは起動していません")
	}
	// Metadata from a crashed process cannot be reused once we own the lock.
	os.Remove(*configPath + ".runtime.json")
	c, err := loadConfig(*configPath)
	if c.Mode == "web" && !*configure {
		showError = false
	}
	if err != nil {
		return err
	}
	if _, err := os.Stat(*configPath); errors.Is(err, os.ErrNotExist) {
		if err := writeJSON(*configPath, c); err != nil {
			return fmt.Errorf("初回設定を保存できません: %w", err)
		}
	}
	active := c
	if *configure {
		active.Mode = "standalone"
		active.StandalonePort = 0
	}
	if *background && active.Mode != "web" {
		return errors.New("--background はWebモード専用です。引数なしで起動してWebモードを保存してください")
	}
	ips, err := machineIPs()
	if err != nil && active.Mode == "web" {
		return err
	}
	address, err := listenAddress(active, ips)
	if err != nil {
		return err
	}
	listener, err := net.Listen("tcp4", address)
	if err != nil {
		return fmt.Errorf("%s で起動できません。IP・ポート使用状況を確認してください: %w", address, err)
	}
	defer listener.Close()
	control := listener
	if active.Mode == "web" {
		control, err = net.Listen("tcp4", "127.0.0.1:0")
		if err != nil {
			return err
		}
		defer control.Close()
	}
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return err
	}
	a := &startupApp{active: active, saved: c, path: *configPath, stop: make(chan struct{}), info: runInfo{PID: os.Getpid(), Mode: active.Mode, URL: "http://" + listener.Addr().String(), ControlURL: "http://" + control.Addr().String(), Token: hex.EncodeToString(secret)}}
	handler := a.handler(control.Addr().String())
	servers := []*http.Server{{Handler: handler, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}}
	listeners := []net.Listener{listener}
	if control != listener {
		servers = append(servers, &http.Server{Handler: handler, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second})
		listeners = append(listeners, control)
	}
	serveErr := make(chan error, len(servers))
	for i, server := range servers {
		go func() { serveErr <- server.Serve(listeners[i]) }()
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		for _, server := range servers {
			server.Shutdown(ctx)
			server.Close()
		}
	}()
	if err := writeJSON(*configPath+".runtime.json", a.info); err != nil {
		return err
	}
	defer os.Remove(*configPath + ".runtime.json")
	log.Printf("起動 mode=%s URL=%s config=%s", active.Mode, a.info.URL, *configPath)
	if active.Mode == "web" && c.WebIP == "auto" && len(ips) > 1 {
		log.Printf("IP候補が複数あります。選択=%s、設定画面で確認してください", listener.Addr())
	}
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(signals)
	waitResult := make(chan error, 1)
	go func() {
		var err error
		select {
		case <-a.stop:
		case <-signals:
		case err = <-serveErr:
			if err == http.ErrServerClosed {
				err = nil
			}
		}
		a.requestStop()
		waitResult <- err
	}()
	if !noBrowser && active.Mode == "standalone" {
		err := runDesktop(a.info.ControlURL+"/#admin="+a.info.Token, *configPath, a.stop, func(f func()) {
			a.mu.Lock()
			a.activate = f
			a.mu.Unlock()
		})
		a.requestStop()
		serverErr := <-waitResult
		if err != nil {
			return err
		}
		if serverErr != nil {
			return serverErr
		}
	} else if err := <-waitResult; err != nil {
		return err
	}
	log.Print("停止")
	return nil
}

func useRunning(path string, configure, stop, noBrowser bool) error {
	client := &http.Client{Timeout: 2 * time.Second, Transport: &http.Transport{Proxy: nil}}
	defer client.CloseIdleConnections()
	var info runInfo
	var lastErr error
	// Concurrent double-clicks can reach the lock before metadata is published.
	for i := 0; i < 30; i++ {
		data, err := os.ReadFile(path + ".runtime.json")
		if err == nil {
			err = json.Unmarshal(data, &info)
		}
		if err == nil && validControlURL(info.ControlURL) && len(info.Token) == 64 {
			req, _ := http.NewRequest(http.MethodGet, info.ControlURL+"/api/ping", nil)
			req.Header.Set("X-App-Token", info.Token)
			resp, requestErr := client.Do(req)
			if requestErr == nil {
				resp.Body.Close()
				if resp.StatusCode == 200 {
					lastErr = nil
					break
				}
				requestErr = errors.New("起動済みアプリの識別情報が一致しません")
			}
			err = requestErr
		} else if err == nil {
			err = errors.New("起動情報が不正です")
		}
		lastErr = err
		time.Sleep(100 * time.Millisecond)
	}
	if lastErr != nil {
		return fmt.Errorf("アプリは起動中ですが接続できません。ログを確認してください: %w", lastErr)
	}
	if stop {
		req, _ := http.NewRequest(http.MethodPost, info.ControlURL+"/api/stop", bytes.NewReader(nil))
		req.Header.Set("X-App-Token", info.Token)
		resp, err := client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return fmt.Errorf("停止に失敗しました: HTTP %d", resp.StatusCode)
		}
		return nil
	}
	if !noBrowser && info.Mode == "standalone" {
		allowForeground(info.PID)
		req, _ := http.NewRequest(http.MethodPost, info.ControlURL+"/api/activate", nil)
		req.Header.Set("X-App-Token", info.Token)
		resp, err := client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return fmt.Errorf("既存画面を表示できません: HTTP %d", resp.StatusCode)
		}
		return nil
	}
	if !noBrowser && configure {
		return openBrowser(info.ControlURL + "/#admin=" + info.Token)
	}
	log.Printf("起動済みのため追加起動を省略: %s", info.URL)
	return nil
}

func validControlURL(value string) bool {
	if !strings.HasPrefix(value, "http://127.0.0.1:") {
		return false
	}
	_, port, err := net.SplitHostPort(strings.TrimPrefix(value, "http://"))
	return err == nil && port != "" && !strings.ContainsAny(port, "/?#")
}

type rollingLog struct {
	mu   sync.Mutex
	path string
}

func (l *rollingLog) check() error { _, err := l.Write(nil); return err }
func (l *rollingLog) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if st, err := os.Stat(l.path); err == nil && st.Size() > 1024*1024 {
		os.Remove(l.path + ".1")
		if err := os.Rename(l.path, l.path+".1"); err != nil {
			return 0, err
		}
	}
	f, err := os.OpenFile(l.path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	return f.Write(p)
}
