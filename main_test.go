package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEmbeddedWebUI(t *testing.T) {
	server := httptest.NewServer(newHandler())
	defer server.Close()

	response, err := http.Get(server.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	if !strings.Contains(string(body), "HTML → PowerPoint") {
		t.Fatal("embedded index page was not served")
	}
	if !strings.Contains(string(body), `id="html-file" type="file" accept=".html,.htm,text/html" multiple`) {
		t.Fatal("HTML file input does not allow multiple files")
	}
	for _, fragment := range []string{
		`id="open-editor-button"`,
		`id="editor-workspace" hidden`,
		`id="html-editor"`,
		`id="preview-page"`,
		`id="preview-select"`,
		`src="./preview.js"`,
		`id="editor-convert-button"`,
		`id="editor-download-link"`,
		`id="file-script-notice"`,
		`id="editor-script-notice"`,
		"追加表示される内容も反映する",
		"この設定について",
		"作成元を確認できるHTML",
		"外部通信は遮断されます",
	} {
		if !strings.Contains(string(body), fragment) {
			t.Errorf("pasted HTML conversion UI is missing %q", fragment)
		}
	}
	for _, confusingLabel := range []string{"信頼できるHTML", "埋め込みスクリプトを実行して変換"} {
		if strings.Contains(string(body), confusingLabel) {
			t.Errorf("embedded page still exposes technical wording %q", confusingLabel)
		}
	}
	if !strings.Contains(string(body), `id="orientation-notice-title"`) ||
		!strings.Contains(string(body), "ページごと") ||
		!strings.Contains(string(body), "縦・横別") ||
		!strings.Contains(string(body), "手動で統合") {
		t.Fatal("mixed-orientation workflow notice is missing")
	}
	if response.Header.Get("Content-Security-Policy") == "" {
		t.Fatal("Content-Security-Policy header is missing")
	}
}

func TestEmbeddedWorkerAndBundleAreServed(t *testing.T) {
	server := httptest.NewServer(newHandler())
	defer server.Close()

	for _, path := range []string{"/converter-worker.js", "/preview.js", "/vendor/pptxgen.bundle.js", "/vendor/jszip.min.js"} {
		response, err := http.Get(server.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != http.StatusOK {
			t.Errorf("GET %s status = %d, want %d", path, response.StatusCode, http.StatusOK)
		}
	}
}

func TestScriptRunnerUsesIsolatedContentSecurityPolicy(t *testing.T) {
	server := httptest.NewServer(newHandler())
	defer server.Close()

	response, err := http.Get(server.URL + "/script-runner.html")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	policy := response.Header.Get("Content-Security-Policy")
	for _, directive := range []string{"sandbox allow-scripts", "default-src 'none'", "script-src 'unsafe-inline'", "connect-src 'none'", "form-action 'none'"} {
		if !strings.Contains(policy, directive) {
			t.Errorf("script runner policy is missing %q: %s", directive, policy)
		}
	}
}
