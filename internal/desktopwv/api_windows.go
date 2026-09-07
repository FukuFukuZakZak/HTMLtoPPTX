// Package desktopwv is the small Win32 WebView2 ABI used by this application.
// Slot order follows Microsoft's WebView2.h base interfaces. Keep this adapter
// narrow: the upstream generated package registers invalid Go callbacks at init.
package desktopwv

import (
	"fmt"
	"syscall"
	"unsafe"
)

type ComProc uintptr

//go:uintptrescapes
func (p ComProc) Call(args ...uintptr) (uintptr, uintptr, error) {
	return syscall.SyscallN(uintptr(p), args...)
}

type IUnknownVtbl struct{ QueryInterface, AddRef, Release ComProc }

func (v *IUnknownVtbl) CallRelease(p unsafe.Pointer) { v.Release.Call(uintptr(p)) }

type table struct {
	IUnknownVtbl
	Methods [64]ComProc
}
type environmentTable struct {
	IUnknownVtbl
	CreateCoreWebView2Controller ComProc
}
type object struct{ Vtbl *table }
type ICoreWebView2Environment struct{ Vtbl *environmentTable }
type ICoreWebView2Controller = object
type ICoreWebView2 = object
type ICoreWebView2Settings = object
type ICoreWebView2ProcessFailedEventArgs = object
type ICoreWebView2NavigationStartingEventArgs struct{ object }
type ICoreWebView2NewWindowRequestedEventArgs struct{ object }
type RECT struct{ Left, Top, Right, Bottom int32 }

//go:uintptrescapes
func (o *object) call(slot int, args ...uintptr) error {
	a := append([]uintptr{uintptr(unsafe.Pointer(o))}, args...)
	hr, _, _ := o.Vtbl.Methods[slot-3].Call(a...)
	if int32(hr) < 0 {
		return fmt.Errorf("WebView2 slot %d: HRESULT 0x%08x", slot, uint32(hr))
	}
	return nil
}
func (o *object) AddRef()                   { o.Vtbl.AddRef.Call(uintptr(unsafe.Pointer(o))) }
func (o *ICoreWebView2Environment) AddRef() { o.Vtbl.AddRef.Call(uintptr(unsafe.Pointer(o))) }
func (o *object) GetCoreWebView2() (*ICoreWebView2, error) {
	var v *ICoreWebView2
	err := o.call(25, uintptr(unsafe.Pointer(&v)))
	return v, err
}
func (o *object) GetSettings() (*ICoreWebView2Settings, error) {
	var v *ICoreWebView2Settings
	err := o.call(3, uintptr(unsafe.Pointer(&v)))
	return v, err
}
func (o *object) Close() error                             { return o.call(24) }
func (o *object) PutBounds(r RECT) error                   { return o.call(6, uintptr(unsafe.Pointer(&r))) }
func (o *object) MoveFocus(reason uintptr) error           { return o.call(12, reason) }
func (o *object) NotifyParentWindowPositionChanged() error { return o.call(23) }
func (o *object) PutIsVisible(value bool) error            { return o.call(4, boolValue(value)) }
func (o *object) PutAreDevToolsEnabled(value bool) error   { return o.call(12, boolValue(value)) }
func (o *object) Navigate(target string) error {
	s, err := syscall.UTF16PtrFromString(target)
	if err != nil {
		return err
	}
	return o.call(5, uintptr(unsafe.Pointer(s)))
}
func (o *object) add(slot int, cb *handler) (int64, error) {
	var token int64
	err := o.call(slot, uintptr(unsafe.Pointer(cb)), uintptr(unsafe.Pointer(&token)))
	return token, err
}
func (o *object) AddNavigationStarting(cb *handler) (int64, error) { return o.add(7, cb) }
func (o *object) AddProcessFailed(cb *handler) (int64, error)      { return o.add(25, cb) }
func (o *object) AddNewWindowRequested(cb *handler) (int64, error) { return o.add(44, cb) }
func (o *object) GetUri() (string, error) {
	var p *uint16
	err := o.call(3, uintptr(unsafe.Pointer(&p)))
	if err != nil {
		return "", err
	}
	if p == nil {
		return "", nil
	}
	defer syscall.NewLazyDLL("ole32.dll").NewProc("CoTaskMemFree").Call(uintptr(unsafe.Pointer(p)))
	var chars []uint16
	for q := p; *q != 0; q = (*uint16)(unsafe.Add(unsafe.Pointer(q), 2)) {
		chars = append(chars, *q)
	}
	return syscall.UTF16ToString(chars), nil
}
func (o *ICoreWebView2NavigationStartingEventArgs) PutCancel(v bool) error {
	return o.call(8, boolValue(v))
}
func (o *ICoreWebView2NewWindowRequestedEventArgs) PutHandled(v bool) error {
	return o.call(6, boolValue(v))
}
func (o *ICoreWebView2NewWindowRequestedEventArgs) GetIsUserInitiated() (bool, error) {
	var v int32
	err := o.call(8, uintptr(unsafe.Pointer(&v)))
	return v != 0, err
}
func boolValue(v bool) uintptr {
	if v {
		return 1
	}
	return 0
}

type unknown interface {
	QueryInterface(*syscall.GUID, *unsafe.Pointer) uintptr
	AddRef() uintptr
	Release() uintptr
}
type handler struct {
	vtbl   *[4]uintptr
	impl   unknown
	invoke func(uintptr, unsafe.Pointer) uintptr
	iid    syscall.GUID
}

var handlerTable = [4]uintptr{
	syscall.NewCallback(func(h *handler, iid *syscall.GUID, out *unsafe.Pointer) uintptr {
		if iid == nil || out == nil {
			return 0x80004003 // E_POINTER
		}
		if *iid == h.iid {
			*out = unsafe.Pointer(h)
			h.impl.AddRef()
			return 0
		}
		return h.impl.QueryInterface(iid, out)
	}),
	syscall.NewCallback(func(h *handler) uintptr { return h.impl.AddRef() }),
	syscall.NewCallback(func(h *handler) uintptr { return h.impl.Release() }),
	syscall.NewCallback(func(h *handler, a uintptr, b unsafe.Pointer) uintptr { return h.invoke(a, b) }),
}

func NewICoreWebView2CreateCoreWebView2ControllerCompletedHandler(i interface {
	unknown
	CreateCoreWebView2ControllerCompleted(uintptr, *ICoreWebView2Controller) uintptr
}) *handler {
	return &handler{vtbl: &handlerTable, impl: i,
		iid: syscall.GUID{Data1: 0x6c4819f3, Data2: 0xc9b7, Data3: 0x4260, Data4: [8]byte{0x81, 0x27, 0xc9, 0xf5, 0xbd, 0xe7, 0xf6, 0x8c}},
		invoke: func(code uintptr, p unsafe.Pointer) uintptr {
			return i.CreateCoreWebView2ControllerCompleted(code, (*ICoreWebView2Controller)(p))
		}}
}
func NewICoreWebView2NavigationStartingEventHandler(i interface {
	unknown
	NavigationStarting(*ICoreWebView2, *ICoreWebView2NavigationStartingEventArgs) uintptr
}) *handler {
	return &handler{vtbl: &handlerTable, impl: i,
		iid: syscall.GUID{Data1: 0x9adbe429, Data2: 0xf36d, Data3: 0x432b, Data4: [8]byte{0x9d, 0xdc, 0xf8, 0x88, 0x1f, 0xbd, 0x76, 0xe3}},
		invoke: func(p uintptr, a unsafe.Pointer) uintptr {
			return i.NavigationStarting(nil, (*ICoreWebView2NavigationStartingEventArgs)(a))
		}}
}
func NewICoreWebView2NewWindowRequestedEventHandler(i interface {
	unknown
	NewWindowRequested(*ICoreWebView2, *ICoreWebView2NewWindowRequestedEventArgs) uintptr
}) *handler {
	return &handler{vtbl: &handlerTable, impl: i,
		iid: syscall.GUID{Data1: 0xd4c185fe, Data2: 0xc81c, Data3: 0x4989, Data4: [8]byte{0x97, 0xaf, 0x2d, 0x3f, 0xa7, 0xab, 0x56, 0x51}},
		invoke: func(p uintptr, a unsafe.Pointer) uintptr {
			return i.NewWindowRequested(nil, (*ICoreWebView2NewWindowRequestedEventArgs)(a))
		}}
}
func NewICoreWebView2ProcessFailedEventHandler(i interface {
	unknown
	ProcessFailed(*ICoreWebView2, *ICoreWebView2ProcessFailedEventArgs) uintptr
}) *handler {
	return &handler{vtbl: &handlerTable, impl: i,
		iid: syscall.GUID{Data1: 0x79e0aea4, Data2: 0x990b, Data3: 0x42d9, Data4: [8]byte{0xaa, 0x1d, 0x0f, 0xcc, 0x2e, 0x5b, 0xc7, 0xf1}},
		invoke: func(p uintptr, a unsafe.Pointer) uintptr {
			return i.ProcessFailed(nil, (*ICoreWebView2ProcessFailedEventArgs)(a))
		}}
}
