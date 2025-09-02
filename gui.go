package main

import (
	"embed"
	"log"

	"github.com/firebat20/based-app/db"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"go.uber.org/zap"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func CreateGUI(baseFolder string, sugarLogger *zap.SugaredLogger) *App {
	// Create local DB manager
	localDbManager, err := db.NewLocalSwitchDBManager(baseFolder)
	if err != nil {
		sugarLogger.Errorf("failed to create local DB manager: %v", err)
	}

	// Create an instance of the app structure with params
	app := NewAppWithParams(baseFolder, sugarLogger, localDbManager)

	// Start background initialization so the switch DB and local library
	// are loaded while the GUI starts. Runs in a goroutine to avoid
	// blocking the main thread / wails.Run call.
	go func() {
		defer func() {
			if r := recover(); r != nil {
				if app.sugarLogger != nil {
					app.sugarLogger.Errorf("panic during background init: %v", r)
				}
			}
		}()

		if app.localDbManager == nil {
			if app.sugarLogger != nil {
				app.sugarLogger.Info("local DB manager not available; skipping background library load")
			}
			return
		}

		// Ensure switch DB is loaded (may download/process titles/versions)
		if err := app.UpdateDB(); err != nil {
			if app.sugarLogger != nil {
				app.sugarLogger.Errorf("UpdateDB error: %v", err)
			}
		}

		// Build local DB and emit libraryLoaded event
		_ = app.UpdateLocalLibrary(false)
	}()

	// Create application with options
	runErr := wails.Run(&options.App{
		Title:             "based-app",
		Width:             1024,
		Height:            768,
		MinWidth:          800,
		MinHeight:         600,
		DisableResize:     false,
		Fullscreen:        false,
		Frameless:         false,
		StartHidden:       false,
		HideWindowOnClose: false,
		BackgroundColour:  &options.RGBA{R: 255, G: 255, B: 255, A: 255},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu:             nil,
		Logger:           nil,
		LogLevel:         logger.DEBUG,
		OnStartup:        app.startup,
		OnDomReady:       app.domReady,
		OnBeforeClose:    app.beforeClose,
		OnShutdown:       app.shutdown,
		WindowStartState: options.Normal,
		Bind: []interface{}{
			app,
		},
		// Windows platform specific options
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
			// DisableFramelessWindowDecorations: false,
			WebviewUserDataPath: "",
			ZoomFactor:          1.0,
		},
		// Mac platform specific options
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				HideTitle:                  false,
				HideTitleBar:               false,
				FullSizeContent:            false,
				UseToolbar:                 false,
				HideToolbarSeparator:       true,
			},
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			About: &mac.AboutInfo{
				Title:   "based-app",
				Message: "",
				Icon:    icon,
			},
		},
	})

	if runErr != nil {
		log.Fatal(runErr)
	}

	return app
}

// Start runs the Wails application (keeps compatibility with previous call site).
func (a *App) Start() {
	// No-op: gui.go's CreateGUI returns an *App and main calls Start() on it for compatibility.
	// The wails.Run call already occurred in CreateGUI above.
}
