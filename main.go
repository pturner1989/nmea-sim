// main.go - Wails application entry point
package main

import (
	"embed"
	"os"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

// main function starts the application
func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Detect RTZ file from command line args
	var rtzFile string
	if len(os.Args) > 1 && strings.HasSuffix(strings.ToLower(os.Args[1]), ".rtz") {
		rtzFile = os.Args[1]
	}
	app.rtzFileOnStartup = rtzFile // Add this field to your App struct

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "NMEA Simulator - MaritimeDevs.org",
		Width:  930,
		Height: 730,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.OnStartup,
		OnDomReady:       app.OnDomReady,
		OnBeforeClose:    app.OnBeforeClose,
		OnShutdown:       app.OnShutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
