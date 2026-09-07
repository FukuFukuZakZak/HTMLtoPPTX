package main

// The native host is deliberately separate from HTTP startup. Web mode never
// creates a COM apartment, loads a browser runtime, or opens a desktop window.
import (
	"crypto/sha256"
	"fmt"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"syscall"
	"unsafe"

	"github.com/wailsapp/go-webview2/webviewloader"
	wv "htmltopptx/internal/desktopwv"
)

var desktopUser32 = syscall.NewLazyDLL("user32.dll")
var desktopWindows = map[uintptr]*desktopWindow{} // UI thread only
var desktopWndProc = syscall.NewCallback(desktopWindowProc)

type windowClass struct {
	Size, Style                        uint32
	Proc                               uintptr
	ClassExtra, WindowExtra            int32
	Instance, Icon, Cursor, Background uintptr
	Menu, Name                         *uint16
	SmallIcon                          uintptr
}
type windowMessage struct {
	Window         uintptr
	Message        uint32
	WParam, LParam uintptr
	Time           uint32
	Point          struct{ X, Y int32 }
	Private        uint32
}
type desktopHost struct {
	main        *desktopWindow
	environment *wv.ICoreWebView2Environment
	err         error
	closed      bool
	callbacks   []any // Keep COM callbacks reachable until all controllers close.
}
type desktopWindow struct {
	host       *desktopHost
	hwnd       uintptr
	url        string
	controller *wv.ICoreWebView2Controller
	view       *wv.ICoreWebView2
}

//go:uintptrescapes
func desktopCall(name string, args ...uintptr) uintptr {
	r, _, _ := desktopUser32.NewProc(name).Call(args...)
	return r
}

func desktopProfile(config string) (string, error) {
	base, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(strings.ToLower(config)))
	path := filepath.Join(base, "HTMLtoPPTX", "WebView2", fmt.Sprintf("%x", sum[:12]))
	return path, os.MkdirAll(path, 0700)
}

func runDesktop(target, config string, stop <-chan struct{}, activate func(func())) error {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	version, err := webviewloader.GetAvailableCoreWebView2BrowserVersionString("")
	if err != nil || version == "" {
		return fmt.Errorf("Microsoft Edge WebView2 Runtime が見つかりません。管理者に Evergreen Standalone Installer（x64）の導入を依頼してください。\nhttps://developer.microsoft.com/microsoft-edge/webview2/\n詳細: %v", err)
	}
	profile, err := desktopProfile(config)
	if err != nil {
		return fmt.Errorf("WebView2の保存先を作成できません: %w", err)
	}
	ole := syscall.NewLazyDLL("ole32.dll")
	hr, _, _ := ole.NewProc("CoInitializeEx").Call(0, 2) // STA
	if int32(hr) < 0 {
		return fmt.Errorf("COM初期化に失敗: 0x%x", hr)
	}
	defer ole.NewProc("CoUninitialize").Call()
	// Per-monitor DPI v2; older supported Windows may reject this harmlessly.
	if proc := desktopUser32.NewProc("SetProcessDpiAwarenessContext"); proc.Find() == nil {
		proc.Call(^uintptr(3))
	}
	host := &desktopHost{}
	main, err := host.createWindow(target, 0)
	if err != nil {
		return err
	}
	host.main = main
	defer host.close()
	activate(func() { desktopCall("PostMessageW", main.hwnd, 0x8001, 0, 0) })
	defer activate(nil)
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-stop:
			desktopCall("PostMessageW", main.hwnd, 0x0010, 0, 0)
		case <-done:
		}
	}()
	// Timeout also covers an environment callback that never arrives.
	desktopCall("SetTimer", main.hwnd, 1, 30000, 0)
	args := ""
	// Explicit test/debug opt-in; production never opens a debugging port.
	if os.Getenv("HTMLTOPPTX_WEBVIEW_DEBUG") == "1" {
		args = os.Getenv("HTMLTOPPTX_WEBVIEW_ARGS")
	}
	err = webviewloader.CreateCoreWebView2EnvironmentWithOptions(host,
		webviewloader.WithUserDataFolder(profile), webviewloader.WithLanguage("ja-JP"), webviewloader.WithAdditionalBrowserArguments(args))
	if err != nil {
		return fmt.Errorf("WebView2を初期化できません: %w", err)
	}
	log.Printf("WebView2 Runtime=%s profile=%s", version, profile)
	var msg windowMessage
	for !host.closed {
		r := desktopCall("GetMessageW", uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(r) == -1 {
			return fmt.Errorf("ウィンドウのメッセージ取得に失敗しました")
		}
		if r == 0 {
			break
		}
		desktopCall("TranslateMessage", uintptr(unsafe.Pointer(&msg)))
		desktopCall("DispatchMessageW", uintptr(unsafe.Pointer(&msg)))
	}
	runtime.KeepAlive(host)
	return host.err
}

func (h *desktopHost) createWindow(target string, owner uintptr) (*desktopWindow, error) {
	className, _ := syscall.UTF16PtrFromString("HTMLtoPPTX.Desktop")
	title, _ := syscall.UTF16PtrFromString("HTML → PowerPoint")
	instance, _, _ := syscall.NewLazyDLL("kernel32.dll").NewProc("GetModuleHandleW").Call(0)
	wc := windowClass{Size: uint32(unsafe.Sizeof(windowClass{})), Proc: desktopWndProc, Instance: instance, Name: className,
		Cursor: desktopCall("LoadCursorW", 0, 32512), Icon: desktopCall("LoadIconW", 0, 32512)}
	desktopCall("RegisterClassExW", uintptr(unsafe.Pointer(&wc)))
	hwnd := desktopCall("CreateWindowExW", 0, uintptr(unsafe.Pointer(className)), uintptr(unsafe.Pointer(title)), 0x00cf0000,
		0x80000000, 0x80000000, 1280, 820, owner, 0, instance, 0)
	if hwnd == 0 {
		return nil, fmt.Errorf("専用ウィンドウを作成できません")
	}
	w := &desktopWindow{host: h, hwnd: hwnd, url: target}
	desktopWindows[hwnd] = w
	desktopCall("ShowWindow", hwnd, 5)
	return w, nil
}

func (h *desktopHost) fail(err error) {
	if h.err == nil {
		h.err = err
	}
	if h.main != nil {
		desktopCall("PostMessageW", h.main.hwnd, 0x0010, 0, 0)
	}
}

func (h *desktopHost) close() {
	if h.closed {
		return
	}
	h.closed = true
	for _, w := range desktopWindows {
		if w.host == h {
			w.close()
		}
	}
	if h.environment != nil {
		h.environment.Vtbl.IUnknownVtbl.CallRelease(unsafe.Pointer(h.environment))
		h.environment = nil
	}
}

func (w *desktopWindow) close() {
	delete(desktopWindows, w.hwnd)
	if w.controller != nil {
		_ = w.controller.Close()
		if w.view != nil {
			w.view.Vtbl.IUnknownVtbl.CallRelease(unsafe.Pointer(w.view))
			w.view = nil
		}
		w.controller.Vtbl.IUnknownVtbl.CallRelease(unsafe.Pointer(w.controller))
		w.controller = nil
	}
	desktopCall("DestroyWindow", w.hwnd)
}

func desktopWindowProc(hwnd, message, wp uintptr, lp unsafe.Pointer) uintptr {
	w := desktopWindows[hwnd]
	if w != nil {
		switch message {
		case 0x0010: // WM_CLOSE: native ownership, independent of page events.
			if w == w.host.main {
				w.host.close()
			} else {
				w.close()
			}
			return 0
		case 0x0005, 0x02e0: // WM_SIZE / WM_DPICHANGED
			if message == 0x02e0 {
				r := (*wv.RECT)(lp)
				desktopCall("SetWindowPos", hwnd, 0, uintptr(r.Left), uintptr(r.Top), uintptr(r.Right-r.Left), uintptr(r.Bottom-r.Top), 0x14)
			}
			w.resize()
			return 0
		case 0x0007: // WM_SETFOCUS
			if w.controller != nil {
				_ = w.controller.MoveFocus(0)
			}
			return 0
		case 0x0003: // WM_MOVE
			if w.controller != nil {
				_ = w.controller.NotifyParentWindowPositionChanged()
			}
		case 0x0113: // WM_TIMER
			w.host.fail(fmt.Errorf("WebView2の初期化がタイムアウトしました。Runtimeと端末のポリシーを確認してください"))
			return 0
		case 0x8001:
			if desktopCall("IsIconic", hwnd) != 0 {
				desktopCall("ShowWindow", hwnd, 9)
			}
			desktopCall("SetForegroundWindow", hwnd)
			return 0
		}
	}
	return desktopCall("DefWindowProcW", hwnd, message, wp, uintptr(lp))
}

func (w *desktopWindow) resize() {
	if w.controller == nil {
		return
	}
	var bounds wv.RECT
	desktopCall("GetClientRect", w.hwnd, uintptr(unsafe.Pointer(&bounds)))
	if err := w.controller.PutBounds(bounds); err != nil {
		w.host.fail(err)
	}
}

func (h *desktopHost) EnvironmentCompleted(code webviewloader.HRESULT, env *webviewloader.ICoreWebView2Environment) webviewloader.HRESULT {
	if h.closed {
		return 0
	}
	if code < 0 || env == nil {
		h.fail(fmt.Errorf("WebView2環境作成に失敗: 0x%x", uint32(code)))
		return 0
	}
	h.environment = (*wv.ICoreWebView2Environment)(unsafe.Pointer(env))
	h.environment.AddRef()
	h.createController(h.main)
	return 0
}

// Callbacks are owned by the host and remain alive for the entire native loop.
// The ABI adapter handles each typed IID; this base handles IUnknown.
type desktopCallback struct {
	ptr  unsafe.Pointer
	refs atomic.Int32
	w    *desktopWindow
}

func (b *desktopCallback) QueryInterface(iid *syscall.GUID, out *unsafe.Pointer) uintptr {
	if out == nil || iid == nil {
		return 0x80004003
	}
	*out = nil
	i := *iid
	if i == (syscall.GUID{Data4: [8]byte{0xc0, 0, 0, 0, 0, 0, 0, 0x46}}) {
		*out = b.ptr
		b.AddRef()
		return 0
	}
	return 0x80004002
}
func (b *desktopCallback) AddRef() uintptr  { return uintptr(b.refs.Add(1)) }
func (b *desktopCallback) Release() uintptr { return uintptr(b.refs.Add(-1)) }

type controllerCallback struct{ desktopCallback }
type navigationCallback struct{ desktopCallback }
type popupCallback struct{ desktopCallback }
type failedCallback struct{ desktopCallback }

func (h *desktopHost) createController(w *desktopWindow) {
	cb := &controllerCallback{desktopCallback: desktopCallback{w: w}}
	handler := wv.NewICoreWebView2CreateCoreWebView2ControllerCompletedHandler(cb)
	cb.ptr = unsafe.Pointer(handler)
	cb.refs.Store(1)
	h.callbacks = append(h.callbacks, handler)
	// v1.0.23's generated wrapper passes &HWND. Win32 requires HWND by value.
	hr, _, _ := h.environment.Vtbl.CreateCoreWebView2Controller.Call(uintptr(unsafe.Pointer(h.environment)), w.hwnd, uintptr(unsafe.Pointer(handler)))
	if int32(hr) < 0 {
		h.fail(fmt.Errorf("WebView2画面作成に失敗: 0x%x", hr))
	}
}

func (cb *controllerCallback) CreateCoreWebView2ControllerCompleted(code uintptr, controller *wv.ICoreWebView2Controller) uintptr {
	w := cb.w
	if w.host.closed || desktopWindows[w.hwnd] == nil {
		if controller != nil {
			_ = controller.Close()
		}
		return 0
	}
	if int32(code) < 0 || controller == nil {
		w.host.fail(fmt.Errorf("WebView2画面初期化に失敗: 0x%x", code))
		return 0
	}
	w.controller = controller
	controller.AddRef()
	var err error
	w.view, err = controller.GetCoreWebView2()
	if err != nil {
		w.host.fail(err)
		return 0
	}
	settings, err := w.view.GetSettings()
	if err != nil {
		w.host.fail(err)
		return 0
	}
	defer settings.Vtbl.IUnknownVtbl.CallRelease(unsafe.Pointer(settings))
	if err = settings.PutAreDevToolsEnabled(os.Getenv("HTMLTOPPTX_WEBVIEW_DEBUG") == "1"); err != nil {
		w.host.fail(err)
		return 0
	}
	nav := &navigationCallback{desktopCallback: desktopCallback{w: w}}
	nh := wv.NewICoreWebView2NavigationStartingEventHandler(nav)
	nav.ptr = unsafe.Pointer(nh)
	nav.refs.Store(1)
	pop := &popupCallback{desktopCallback: desktopCallback{w: w}}
	ph := wv.NewICoreWebView2NewWindowRequestedEventHandler(pop)
	pop.ptr = unsafe.Pointer(ph)
	pop.refs.Store(1)
	fail := &failedCallback{desktopCallback: desktopCallback{w: w}}
	fh := wv.NewICoreWebView2ProcessFailedEventHandler(fail)
	fail.ptr = unsafe.Pointer(fh)
	fail.refs.Store(1)
	w.host.callbacks = append(w.host.callbacks, nh, ph, fh)
	if _, err = w.view.AddNavigationStarting(nh); err != nil {
		w.host.fail(err)
		return 0
	}
	if _, err = w.view.AddNewWindowRequested(ph); err != nil {
		w.host.fail(err)
		return 0
	}
	if _, err = w.view.AddProcessFailed(fh); err != nil {
		w.host.fail(err)
		return 0
	}
	w.resize()
	_ = controller.PutIsVisible(true)
	_ = controller.MoveFocus(0)
	if err = w.view.Navigate(w.url); err != nil {
		w.host.fail(err)
	}
	if w == w.host.main {
		desktopCall("KillTimer", w.hwnd, 1)
	}
	return 0
}

func sameDesktopOrigin(target, base string) bool {
	t, err := url.Parse(target)
	if err != nil {
		return false
	}
	b, err := url.Parse(base)
	if err != nil {
		return false
	}
	return t.Scheme == "http" && t.Host == b.Host && t.User == nil
}

func (cb *navigationCallback) NavigationStarting(_ *wv.ICoreWebView2, args *wv.ICoreWebView2NavigationStartingEventArgs) uintptr {
	target, err := args.GetUri()
	if err != nil || !sameDesktopOrigin(target, cb.w.url) {
		_ = args.PutCancel(true)
	}
	return 0
}
func (cb *popupCallback) NewWindowRequested(_ *wv.ICoreWebView2, args *wv.ICoreWebView2NewWindowRequestedEventArgs) uintptr {
	_ = args.PutHandled(true)
	target, err := args.GetUri()
	user, _ := args.GetIsUserInitiated()
	parsed, _ := url.Parse(target)
	// Only the trusted, bundled manual can open a child window.
	if err != nil || !user || !sameDesktopOrigin(target, cb.w.url) || parsed == nil || !strings.HasPrefix(parsed.Path, "/howtouse/") {
		return 0
	}
	w, err := cb.w.host.createWindow(target, cb.w.host.main.hwnd)
	if err != nil {
		cb.w.host.fail(err)
	} else {
		cb.w.host.createController(w)
	}
	return 0
}
func (cb *failedCallback) ProcessFailed(_ *wv.ICoreWebView2, _ *wv.ICoreWebView2ProcessFailedEventArgs) uintptr {
	cb.w.host.fail(fmt.Errorf("WebView2が異常終了しました。アプリを再起動してください"))
	return 0
}
