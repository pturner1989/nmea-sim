// app.go - Updated Wails backend for React frontend
package main

import (
	"context"
	"encoding/xml"
	"fmt"
	"os"
	"sync"
	"time"

	"route-sim/nmea"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx       context.Context
	simulator *nmea.Simulator
	mu        sync.RWMutex
	isRunning bool
	mode      string
	rtzFileOnStartup string
}

// SimulationStatus represents the current state for frontend
type SimulationStatus struct {
	IsRunning       bool                   `json:"isRunning"`
	Mode            string                 `json:"mode"` // "manual" or "rtz"
	Position        Position               `json:"position"`
	Speed           float64                `json:"speed"`
	Course          float64                `json:"course"`
	Route           *RTZRoute              `json:"route,omitempty"`
	WaypointStatus  map[string]interface{} `json:"waypointStatus,omitempty"`
}

// Position for JSON serialization
type Position struct {
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Timestamp time.Time `json:"timestamp"`
}

// Waypoint for JSON serialization
type Waypoint struct {
	ID        string  `json:"id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// RTZRoute for JSON serialization
type RTZRoute struct {
	Waypoints []Waypoint `json:"waypoints"`
}

// ManualConfig for manual mode
type ManualConfig struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Speed     float64 `json:"speed"`
	Course    float64 `json:"course"`
}

// RTZConfig for RTZ mode
type RTZConfig struct {
	FilePath string  `json:"filePath"`
	Speed    float64 `json:"speed"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// OnStartup is called when the app starts up
func (a *App) OnStartup(ctx context.Context) {
	a.ctx = ctx
	a.mode = "manual"
}

// OnDomReady is called after front-end resources have been loaded
func (a *App) OnDomReady(ctx context.Context) {
	// Optional: Show a startup message
	if a.rtzFileOnStartup != "" {
		runtime.EventsEmit(ctx, "openRTZFile", a.rtzFileOnStartup)
	}
}

// OnBeforeClose is called when the application is about to quit
func (a *App) OnBeforeClose(ctx context.Context) (prevent bool) {
	a.StopSimulation()
	return false
}

// OnShutdown is called when the application is shutting down
func (a *App) OnShutdown(ctx context.Context) {
	if a.simulator != nil {
		a.simulator.Close()
	}
}

// StartManualSimulation starts simulation with manual parameters
func (a *App) StartManualSimulation(config ManualConfig) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.isRunning {
		return fmt.Errorf("simulation is already running")
	}

	// Stop existing simulator if any
	if a.simulator != nil {
		a.simulator.Close()
	}

	// Create new simulator
	simConfig := nmea.SimulatorConfig{
		Port:         10110,
		TransmitRate: 1 * time.Second,
		MagneticVar:  -5.0,
	}

	var err error
	a.simulator, err = nmea.NewSimulator(simConfig)
	if err != nil {
		return fmt.Errorf("failed to create simulator: %w", err)
	}

	// Set position and start
	a.simulator.SetPosition(config.Latitude, config.Longitude, config.Speed, config.Course)

	if err := a.simulator.Start(); err != nil {
		return fmt.Errorf("failed to start simulator: %w", err)
	}

	a.isRunning = true
	a.mode = "manual"
	return nil
}

// StartRTZSimulation starts simulation with RTZ file
func (a *App) StartRTZSimulation(config RTZConfig) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.isRunning {
		return fmt.Errorf("simulation is already running")
	}

	// Stop existing simulator if any
	if a.simulator != nil {
		a.simulator.Close()
	}

	// Read RTZ file
	rtzData, err := os.ReadFile(config.FilePath)
	if err != nil {
		return fmt.Errorf("failed to read RTZ file: %w", err)
	}

	// Create new simulator
	simConfig := nmea.SimulatorConfig{
		Port:         10110,
		TransmitRate: 1 * time.Second,
		MagneticVar:  -3.0,
	}

	a.simulator, err = nmea.NewSimulator(simConfig)
	if err != nil {
		return fmt.Errorf("failed to create simulator: %w", err)
	}

	// Load route and start
	if err := a.simulator.LoadRTZRoute(rtzData, config.Speed); err != nil {
		return fmt.Errorf("failed to load RTZ route: %w", err)
	}

	if err := a.simulator.Start(); err != nil {
		return fmt.Errorf("failed to start simulator: %w", err)
	}

	a.isRunning = true
	a.mode = "rtz"
	return nil
}

// StopSimulation stops the current simulation
func (a *App) StopSimulation() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if !a.isRunning {
		return fmt.Errorf("no simulation is running")
	}

	if a.simulator != nil {
		a.simulator.Stop()
	}

	a.isRunning = false
	return nil
}

// UpdateSpeed updates the simulation speed
func (a *App) UpdateSpeed(speed float64) error {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if !a.isRunning || a.simulator == nil {
		return fmt.Errorf("no simulation is running")
	}

	a.simulator.UpdateSpeed(speed)
	return nil
}

// UpdateCourse updates the simulation course (manual mode only)
func (a *App) UpdateCourse(course float64) error {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if !a.isRunning || a.simulator == nil {
		return fmt.Errorf("no simulation is running")
	}

	a.simulator.UpdateCourse(course)
	return nil
}

// GetStatus returns the current simulation status
func (a *App) GetStatus() (SimulationStatus, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	status := SimulationStatus{
		IsRunning: a.isRunning,
		Mode:      a.mode,
		Position:  Position{Latitude: 0, Longitude: 0, Timestamp: time.Now()},
		Speed:     0,
		Course:    0,
	}

	if a.simulator != nil {
		state := a.simulator.GetCurrentState()
		status.Position = Position{
			Latitude:  state.Position.Latitude,
			Longitude: state.Position.Longitude,
			Timestamp: state.Position.Timestamp,
		}
		status.Speed = state.Speed
		status.Course = state.Course

		// Convert route if available
		route := a.simulator.GetRoute()
		if route != nil {
			status.Route = &RTZRoute{
				Waypoints: make([]Waypoint, len(route.Waypoints)),
			}
			for i, wp := range route.Waypoints {
				status.Route.Waypoints[i] = Waypoint{
					ID:        wp.ID,
					Latitude:  wp.Latitude,
					Longitude: wp.Longitude,
				}
			}

			// Add waypoint status for RTZ mode
			if a.mode == "rtz" {
				info := a.simulator.GetWaypointInfo()
				status.WaypointStatus = map[string]interface{}{
					"currentWaypoint":   info.CurrentWaypoint,
					"totalWaypoints":    info.TotalWaypoints,
					"autoNavigate":      info.AutoNavigate,
					"distanceToTarget":  info.DistanceToTarget,
				}

				if info.TargetWaypoint != nil {
					status.WaypointStatus["targetWaypoint"] = map[string]interface{}{
						"id":        info.TargetWaypoint.ID,
						"latitude":  info.TargetWaypoint.Latitude,
						"longitude": info.TargetWaypoint.Longitude,
					}
				}
			}
		}
	}

	return status, nil
}

// OpenFileDialog opens a file dialog to select RTZ file
func (a *App) OpenFileDialog() (string, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select RTZ Route File",
		Filters: []runtime.FileFilter{
			{DisplayName: "RTZ Route Files (*.rtz)", Pattern: "*.rtz"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
		DefaultDirectory: "", // Will use user's default directory
	})

	if err != nil {
		return "", fmt.Errorf("failed to open file dialog: %w", err)
	}

	// Return empty string if user cancelled
	if selection == "" {
		return "", nil
	}

	// Validate file exists and has .rtz extension
	if _, err := os.Stat(selection); os.IsNotExist(err) {
		return "", fmt.Errorf("selected file does not exist: %s", selection)
	}

	return selection, nil
}

// ShowInfoDialog shows an information dialog
func (a *App) ShowInfoDialog(title, message string) {
	runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:    runtime.InfoDialog,
		Title:   title,
		Message: message,
	})
}

// ShowErrorDialog shows an error dialog
func (a *App) ShowErrorDialog(title, message string) {
	runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:    runtime.ErrorDialog,
		Title:   title,
		Message: message,
	})
}

// ValidateRTZFile validates an RTZ file and returns basic information about it
func (a *App) ValidateRTZFile(filePath string) (map[string]interface{}, error) {
	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("file does not exist: %s", filePath)
	}

	// Read file content
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Try to parse as RTZ to validate - handle namespaces properly
	var rtz struct {
		XMLName   xml.Name `xml:"route"`
		Version   string   `xml:"version,attr"`
		RouteInfo struct {
			RouteName           string `xml:"routeName,attr"`
			VesselName          string `xml:"vesselName,attr"`
			VesselIMO           string `xml:"vesselIMO,attr"`
			RouteChangesHistory string `xml:"routeChangesHistory,attr"`
		} `xml:"routeInfo"`
		Waypoints struct {
			Waypoint []struct {
				ID       string `xml:"id,attr"`
				Name     string `xml:"name,attr"`
				Revision string `xml:"revision,attr"`
				Radius   string `xml:"radius,attr"`
				Position struct {
					Lat float64 `xml:"lat,attr"`
					Lon float64 `xml:"lon,attr"`
				} `xml:"position"`
			} `xml:"waypoint"`
		} `xml:"waypoints"`
	}

	if err := xml.Unmarshal(data, &rtz); err != nil {
		return nil, fmt.Errorf("invalid RTZ file format: %w", err)
	}

	// Check if we have basic required elements
	if rtz.XMLName.Local != "route" {
		return nil, fmt.Errorf("not a valid RTZ route file - missing route element")
	}

	if len(rtz.Waypoints.Waypoint) == 0 {
		return nil, fmt.Errorf("RTZ file contains no waypoints")
	}

	// Validate that waypoints have positions
	validWaypoints := 0
	for _, wp := range rtz.Waypoints.Waypoint {
		if wp.Position.Lat != 0 || wp.Position.Lon != 0 {
			validWaypoints++
		}
	}

	if validWaypoints == 0 {
		return nil, fmt.Errorf("RTZ file contains no valid waypoint positions")
	}

	// Return file information
	result := map[string]interface{}{
		"valid":          true,
		"version":        rtz.Version,
		"routeName":      rtz.RouteInfo.RouteName,
		"vesselName":     rtz.RouteInfo.VesselName,
		"vesselIMO":      rtz.RouteInfo.VesselIMO,
		"waypointCount":  len(rtz.Waypoints.Waypoint),
		"validPositions": validWaypoints,
		"fileSize":       len(data),
		"filePath":       filePath,
	}

	// Add first and last waypoint info for reference
	if len(rtz.Waypoints.Waypoint) > 0 {
		first := rtz.Waypoints.Waypoint[0]
		result["firstWaypoint"] = map[string]interface{}{
			"id":   first.ID,
			"name": first.Name,
			"lat":  first.Position.Lat,
			"lon":  first.Position.Lon,
		}

		if len(rtz.Waypoints.Waypoint) > 1 {
			last := rtz.Waypoints.Waypoint[len(rtz.Waypoints.Waypoint)-1]
			result["lastWaypoint"] = map[string]interface{}{
				"id":   last.ID,
				"name": last.Name,
				"lat":  last.Position.Lat,
				"lon":  last.Position.Lon,
			}
		}
	}

	return result, nil
}

// GetSimulatorInfo returns basic information about the simulator
func (a *App) GetSimulatorInfo() map[string]interface{} {
	return map[string]interface{}{
		"version":   "1.0.0",
		"host":      "127.0.0.1",
		"port":      10110,
		"protocol":  "UDP",
		"format":    "NMEA 0183",
		"sentences": []string{"GGA", "RMC", "GLL", "VTG", "GSA", "GSV"},
	}
}

// AdvanceWaypoint advances to the next waypoint in RTZ mode
func (a *App) AdvanceWaypoint() error {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if !a.isRunning || a.simulator == nil {
		return fmt.Errorf("no simulation is running")
	}

	if a.mode != "rtz" {
		return fmt.Errorf("waypoint navigation only available in RTZ mode")
	}

	if !a.simulator.AdvanceToNextWaypoint() {
		return fmt.Errorf("cannot advance waypoint - already at last waypoint or no route loaded")
	}

	return nil
}

// PreviousWaypoint goes back to the previous waypoint in RTZ mode
func (a *App) PreviousWaypoint() error {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if !a.isRunning || a.simulator == nil {
		return fmt.Errorf("no simulation is running")
	}

	if a.mode != "rtz" {
		return fmt.Errorf("waypoint navigation only available in RTZ mode")
	}

	if !a.simulator.GoToPreviousWaypoint() {
		return fmt.Errorf("cannot go to previous waypoint - already at first waypoint or no route loaded")
	}

	return nil
}

// SetWaypoint jumps to a specific waypoint in RTZ mode
func (a *App) SetWaypoint(waypointIndex int) error {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if !a.isRunning || a.simulator == nil {
		return fmt.Errorf("no simulation is running")
	}

	if a.mode != "rtz" {
		return fmt.Errorf("waypoint navigation only available in RTZ mode")
	}

	if !a.simulator.SetCurrentWaypoint(waypointIndex) {
		return fmt.Errorf("invalid waypoint index or no route loaded")
	}

	return nil
}

// GetWaypointStatus returns current waypoint status for RTZ mode
func (a *App) GetWaypointStatus() (map[string]interface{}, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if !a.isRunning || a.simulator == nil {
		return nil, fmt.Errorf("no simulation is running")
	}

	if a.mode != "rtz" {
		return nil, fmt.Errorf("waypoint status only available in RTZ mode")
	}

	info := a.simulator.GetWaypointInfo()

	result := map[string]interface{}{
		"currentWaypoint": info.CurrentWaypoint,
		"totalWaypoints":  info.TotalWaypoints,
		"autoNavigate":    info.AutoNavigate,
		"distanceToTarget": info.DistanceToTarget,
	}

	if info.TargetWaypoint != nil {
		result["targetWaypoint"] = map[string]interface{}{
			"id":        info.TargetWaypoint.ID,
			"latitude":  info.TargetWaypoint.Latitude,
			"longitude": info.TargetWaypoint.Longitude,
		}
	}

	return result, nil
}

// PauseSimulation pauses the current simulation
func (a *App) PauseSimulation() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if !a.isRunning || a.simulator == nil {
		return fmt.Errorf("no simulation is running")
	}

	a.simulator.UpdateSpeed(0)
	return nil
}

// ResumeSimulation resumes the paused simulation with previous speed
func (a *App) ResumeSimulation(speed float64) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if !a.isRunning || a.simulator == nil {
		return fmt.Errorf("no simulation is running")
	}

	a.simulator.UpdateSpeed(speed)
	return nil
}
