package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
)

//go:embed web
var embeddedWeb embed.FS

func main() {
	if err := runApplication(os.Args[1:]); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}

func newHandler() http.Handler {
	webRoot, err := fs.Sub(embeddedWeb, "web")
	if err != nil {
		panic(err)
	}

	static := http.FileServer(http.FS(webRoot))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/script-runner.html" {
			w.Header().Set("Content-Security-Policy", "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; worker-src 'none'; child-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'")
		} else {
			w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self'; frame-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'")
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		static.ServeHTTP(w, r)
	})
}
