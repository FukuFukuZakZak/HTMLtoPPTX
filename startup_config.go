package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"sort"
)

type startupConfig struct {
	Mode           string `json:"mode"`
	StandalonePort int    `json:"standalonePort"`
	WebIP          string `json:"webIP"`
	WebPort        int    `json:"webPort"`
}

func defaultConfig() startupConfig {
	return startupConfig{Mode: "standalone", WebIP: "auto", WebPort: 8080}
}

func (c startupConfig) validate() error {
	if c.Mode != "standalone" && c.Mode != "web" {
		return errors.New("起動モードは standalone または web を指定してください")
	}
	if c.StandalonePort < 0 || c.StandalonePort > 65535 {
		return errors.New("ローカルポートは自動（0）または1〜65535を指定してください")
	}
	if c.WebPort < 1 || c.WebPort > 65535 {
		return errors.New("Webポートは1〜65535の固定値を指定してください")
	}
	if c.WebIP != "auto" {
		ip := net.ParseIP(c.WebIP)
		if ip == nil || ip.To4() == nil || !ip.IsGlobalUnicast() {
			return errors.New("Web IPは auto または端末に割り当てられたIPv4アドレスを指定してください（全インターフェース・ループバック不可）")
		}
	}
	return nil
}

func loadConfig(path string) (startupConfig, error) {
	c := defaultConfig()
	f, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return c, nil
	}
	if err != nil {
		return c, err
	}
	defer f.Close()
	d := json.NewDecoder(io.LimitReader(f, 4097))
	d.DisallowUnknownFields()
	loaded := &c
	if err = d.Decode(&loaded); err != nil {
		return c, fmt.Errorf("設定ファイルを読み込めません: %w", err)
	}
	if loaded == nil {
		return c, errors.New("設定ファイルはJSONオブジェクトを指定してください")
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return c, errors.New("設定ファイルの末尾が不正です")
	}
	return c, c.validate()
}

func writeJSON(path string, value any) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".htmltopptx-*.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if _, err = f.Write(append(data, '\n')); err == nil {
		err = f.Sync()
	}
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(f.Name(), path)
}

type machineIP struct {
	Address   string `json:"address"`
	Interface string `json:"interface"`
	Index     int    `json:"-"`
}

func machineIPs() ([]machineIP, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}
	result := []machineIP{}
	for _, nic := range interfaces {
		if nic.Flags&net.FlagUp == 0 || nic.Flags&net.FlagLoopback != 0 {
			continue
		}
		addresses, err := nic.Addrs()
		if err != nil {
			return nil, err
		}
		for _, addr := range addresses {
			ip, _, err := net.ParseCIDR(addr.String())
			if err == nil && ip.To4() != nil && ip.IsGlobalUnicast() {
				result = append(result, machineIP{ip.String(), nic.Name, nic.Index})
			}
		}
	}
	// Prefer private intranet addresses, then the stable interface index/address.
	sort.Slice(result, func(i, j int) bool {
		a, b := result[i], result[j]
		ap, bp := net.ParseIP(a.Address).IsPrivate(), net.ParseIP(b.Address).IsPrivate()
		if ap != bp {
			return ap
		}
		if a.Index != b.Index {
			return a.Index < b.Index
		}
		return a.Address < b.Address
	})
	return result, nil
}

func listenAddress(c startupConfig, ips []machineIP) (string, error) {
	if c.Mode == "standalone" {
		return net.JoinHostPort("127.0.0.1", fmt.Sprint(c.StandalonePort)), nil
	}
	ip := c.WebIP
	if ip == "auto" {
		if len(ips) == 0 {
			return "", errors.New("利用できる端末IPv4アドレスがありません。ネットワーク接続後に再起動してください")
		}
		ip = ips[0].Address
	}
	for _, candidate := range ips {
		if candidate.Address == ip {
			return net.JoinHostPort(ip, fmt.Sprint(c.WebPort)), nil
		}
	}
	return "", fmt.Errorf("指定IP %s は現在この端末に割り当てられていません", ip)
}
