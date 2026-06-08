package main

import (
	"fmt"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

var (
	modkernel32              = windows.NewLazySystemDLL("kernel32.dll")
	modpdh                   = windows.NewLazySystemDLL("pdh.dll")
	procGlobalMemoryStatusEx = modkernel32.NewProc("GlobalMemoryStatusEx")
	procPdhOpenQuery         = modpdh.NewProc("PdhOpenQuery")
	procPdhAddCounter        = modpdh.NewProc("PdhAddEnglishCounterW")
	procPdhCollectData       = modpdh.NewProc("PdhCollectQueryData")
	procPdhGetFormattedValue = modpdh.NewProc("PdhGetFormattedCounterValue")
	procPdhCloseQuery        = modpdh.NewProc("PdhCloseQuery")
)

type memoryStatusEx struct {
	dwLength                uint32
	dwMemoryLoad            uint32
	ullTotalPhys            uint64
	ullAvailPhys            uint64
	ullTotalPageFile        uint64
	ullAvailPageFile        uint64
	ullTotalVirtual         uint64
	ullAvailVirtual         uint64
	ullAvailExtendedVirtual uint64
}

type pdhFmtCounterValue struct {
	CStatus     uint32
	_           [4]byte
	DoubleValue float64
}

const pdhFmtDouble = 0x00000200

// Persistent sampler — one PDH query kept open, sampled on a background ticker.
type sysSampler struct {
	mu         sync.RWMutex
	query      syscall.Handle
	cpuCounter syscall.Handle
	gpuCounter syscall.Handle
	cpu        int
	gpu        int
	ready      bool
}

var sampler sysSampler

func initSampler() {
	var q syscall.Handle
	r, _, _ := procPdhOpenQuery.Call(0, 0, uintptr(unsafe.Pointer(&q)))
	if r != 0 {
		return
	}
	sampler.query = q

	cpuPath, _ := syscall.UTF16PtrFromString(`\Processor(_Total)\% Processor Time`)
	procPdhAddCounter.Call(uintptr(q), uintptr(unsafe.Pointer(cpuPath)), 0, uintptr(unsafe.Pointer(&sampler.cpuCounter)))

	gpuPath, _ := syscall.UTF16PtrFromString(`\GPU Engine(*engtype_3D)\Utilization Percentage`)
	procPdhAddCounter.Call(uintptr(q), uintptr(unsafe.Pointer(gpuPath)), 0, uintptr(unsafe.Pointer(&sampler.gpuCounter)))

	// Prime the first collection so the second one has a baseline
	procPdhCollectData.Call(uintptr(q))
	time.Sleep(500 * time.Millisecond)
	sampler.collectLocked()
	sampler.ready = true

	go func() {
		t := time.NewTicker(2 * time.Second)
		defer t.Stop()
		for range t.C {
			sampler.mu.Lock()
			sampler.collectLocked()
			sampler.mu.Unlock()
		}
	}()
}

func (s *sysSampler) collectLocked() {
	procPdhCollectData.Call(uintptr(s.query))

	var fv pdhFmtCounterValue
	r, _, _ := procPdhGetFormattedValue.Call(uintptr(s.cpuCounter), pdhFmtDouble, 0, uintptr(unsafe.Pointer(&fv)))
	if r == 0 {
		v := int(fv.DoubleValue + 0.5)
		if v > 100 {
			v = 100
		}
		s.cpu = v
	}

	r, _, _ = procPdhGetFormattedValue.Call(uintptr(s.gpuCounter), pdhFmtDouble, 0, uintptr(unsafe.Pointer(&fv)))
	if r == 0 {
		v := int(fv.DoubleValue + 0.5)
		if v > 100 {
			v = 100
		}
		s.gpu = v
	}
}

func getCPUPercent() int {
	sampler.mu.RLock()
	defer sampler.mu.RUnlock()
	return sampler.cpu
}

func getGPUPercent() int {
	sampler.mu.RLock()
	defer sampler.mu.RUnlock()
	return sampler.gpu
}

func getRAMStats() (usedPct int, usedMB int, totalMB int) {
	var ms memoryStatusEx
	ms.dwLength = uint32(unsafe.Sizeof(ms))
	procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&ms)))
	usedPct = int(ms.dwMemoryLoad)
	totalMB = int(ms.ullTotalPhys / 1024 / 1024)
	usedMB = totalMB - int(ms.ullAvailPhys/1024/1024)
	return
}

func getGPUName() string {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, `SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000`, registry.QUERY_VALUE)
	if err == nil {
		defer key.Close()
		if name, _, err := key.GetStringValue("DriverDesc"); err == nil && name != "" {
			return name
		}
	}
	for i := 1; i <= 4; i++ {
		key, err := registry.OpenKey(registry.LOCAL_MACHINE, fmt.Sprintf(`SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\%04d`, i), registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		name, _, err := key.GetStringValue("DriverDesc")
		key.Close()
		if err == nil && name != "" && !strings.Contains(strings.ToLower(name), "microsoft") {
			return name
		}
	}
	return "GPU"
}

func getSystemStats() map[string]interface{} {
	ramPct, ramUsed, ramTotal := getRAMStats()
	cpu := getCPUPercent()
	gpu := getGPUPercent()
	gpuName := getGPUName()

	return map[string]interface{}{
		"cpu":        cpu,
		"ram":        ramPct,
		"ramUsedMB":  ramUsed,
		"ramTotalMB": ramTotal,
		"gpu":        gpu,
		"gpuName":    gpuName,
	}
}
