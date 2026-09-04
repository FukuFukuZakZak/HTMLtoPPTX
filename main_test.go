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
	if response.Header.Get("Content-Security-Policy") == "" {
		t.Fatal("Content-Security-Policy header is missing")
	}
}

func TestEmbeddedWorkerAndBundleAreServed(t *testing.T) {
	server := httptest.NewServer(newHandler())
	defer server.Close()

	for _, path := range []string{"/converter-worker.js", "/vendor/pptxgen.bundle.js"} {
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
