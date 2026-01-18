//go:build windows

package console

import (
	"fmt"
	"os"
	"runtime"
	"syscall"
)

func FixConsoleOutput() {
	if runtime.GOOS == "windows" {
		const ATTACH_PARENT_PROCESS = ^uintptr(0)
		proc := syscall.MustLoadDLL("kernel32.dll").MustFindProc("AttachConsole")
		r0, _, _ := proc.Call(ATTACH_PARENT_PROCESS)

		if r0 == 0 {
			// Failed to attach to parent console. This is normal when:
			// - Running during Wails binding generation
			// - Launched from GUI context
			// - No parent console exists
			// Silently return instead of treating as fatal error
			return
		}

		hout, err1 := syscall.GetStdHandle(syscall.STD_OUTPUT_HANDLE)
		herr, err2 := syscall.GetStdHandle(syscall.STD_ERROR_HANDLE)
		if err1 != nil || err2 != nil {
			// We successfully attached but can't get handles - this IS an error
			fmt.Printf("Could not get console handles: %v, %v\n", err1, err2)
			os.Exit(2)
		}

		os.Stdout = os.NewFile(uintptr(hout), "/dev/stdout")
		os.Stderr = os.NewFile(uintptr(herr), "/dev/stderr")

		fmt.Print("\r\n")
	}
}
