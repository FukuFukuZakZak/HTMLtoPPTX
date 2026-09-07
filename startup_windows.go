package main

import (
	"errors"
	"os/exec"
	"syscall"
	"unsafe"
)

var errInstanceRunning = errors.New("同じ設定のアプリが既に起動しています")

// An OS-held exclusive file handle works across Task Scheduler logon sessions.
// The file remains after exit; the kernel releases the lock even after a crash.
func acquireInstance(path string) (func(), error) {
	name, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return nil, err
	}
	h, err := syscall.CreateFile(name, syscall.GENERIC_READ|syscall.GENERIC_WRITE, 0, nil, syscall.OPEN_ALWAYS, syscall.FILE_ATTRIBUTE_NORMAL, 0)
	if err == syscall.Errno(32) {
		return nil, errInstanceRunning
	}
	if err != nil {
		return nil, err
	}
	return func() { syscall.CloseHandle(h) }, nil
}

func openBrowser(url string) error {
	cmd := exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	if err := cmd.Start(); err != nil {
		return err
	}
	go cmd.Wait()
	return nil
}

func showStartupError(message string) {
	title, _ := syscall.UTF16PtrFromString("HTML → PowerPoint 起動エラー")
	body, _ := syscall.UTF16PtrFromString(message)
	syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW").Call(0, uintptr(unsafe.Pointer(body)), uintptr(unsafe.Pointer(title)), 0x10)
}

func allowForeground(pid int) {
	syscall.NewLazyDLL("user32.dll").NewProc("AllowSetForegroundWindow").Call(uintptr(pid))
}
