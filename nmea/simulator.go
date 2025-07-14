package nmea

import (
	"encoding/xml"
	"fmt"
	"math"
	"net"
	"sync"
	"time"
)

// Position represents a geographic position
type Position struct {
	Latitude  float64
	Longitude float64
	Timestamp time.Time
}

// NavigationState holds the current navigation data
type NavigationState struct {
	Position    Position
	Speed       float64 // knots
	Course      float64 // degrees true
	MagneticVar float64 // magnetic variation
	FixQuality  int     // GPS fix quality (0=invalid, 1=GPS fix, 2=DGPS fix)
	Satellites  int     // number of satellites
	HDOP        float64 // horizontal dilution of precision
	Altitude    float64 // altitude in meters
}

// Waypoint represents a route waypoint
type Waypoint struct {
	ID        string
	Latitude  float64
	Longitude float64
}

// RTZRoute represents a parsed RTZ route
type RTZRoute struct {
	Waypoints []Waypoint
}

// WaypointInfo contains current waypoint status information
type WaypointInfo struct {
	CurrentWaypoint int       `json:"currentWaypoint"`
	TotalWaypoints  int       `json:"totalWaypoints"`
	TargetWaypoint  *Waypoint `json:"targetWaypoint"`
	DistanceToTarget float64  `json:"distanceToTarget"`
	AutoNavigate    bool      `json:"autoNavigate"`
}

// RTZ XML structures for parsing
type rtzRoute struct {
	XMLName   xml.Name      `xml:"route"`
	RouteInfo rtzRouteInfo  `xml:"routeInfo"`
	Waypoints []rtzWaypoint `xml:"waypoints>waypoint"`
}

type rtzRouteInfo struct {
	RouteName string `xml:"routeName,attr"`
}

type rtzWaypoint struct {
	ID       string      `xml:"id,attr"`
	Name     string      `xml:"name,attr"`
	Position rtzPosition `xml:"position"`
}

type rtzPosition struct {
	Latitude  float64 `xml:"lat,attr"`
	Longitude float64 `xml:"lon,attr"`
}

// Simulator is the main NMEA simulator
type Simulator struct {
	mu              sync.RWMutex
	state           NavigationState
	conn            *net.UDPConn
	multicastAddr   *net.UDPAddr
	transmitRate    time.Duration
	running         bool
	stopChan        chan struct{}
	route           *RTZRoute
	currentWaypoint int
	autoNavigate    bool
}

// SimulatorConfig holds configuration for the simulator
type SimulatorConfig struct {
	MulticastIP  string
	Port         int
	TransmitRate time.Duration // how often to send NMEA sentences
	MagneticVar  float64       // magnetic variation for the area
}

// NewSimulator creates a new NMEA simulator
func NewSimulator(config SimulatorConfig) (*Simulator, error) {
	// Default to localhost if no multicast IP specified
	if config.MulticastIP == "" {
		config.MulticastIP = "127.0.0.1"
	}

	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", config.MulticastIP, config.Port))
	if err != nil {
		return nil, fmt.Errorf("failed to resolve multicast address: %w", err)
	}

	conn, err := net.DialUDP("udp", nil, addr)
	if err != nil {
		return nil, fmt.Errorf("failed to create UDP connection: %w", err)
	}

	return &Simulator{
		multicastAddr: addr,
		conn:          conn,
		transmitRate:  config.TransmitRate,
		stopChan:      make(chan struct{}),
		state: NavigationState{
			MagneticVar: config.MagneticVar,
			FixQuality:  1,
			Satellites:  8,
			HDOP:        1.2,
			Altitude:    0.0,
		},
	}, nil
}

// SetPosition sets the current position, speed, and course
func (s *Simulator) SetPosition(lat, lon, speed, course float64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.state.Position = Position{
		Latitude:  lat,
		Longitude: lon,
		Timestamp: time.Now().UTC(),
	}
	s.state.Speed = speed
	s.state.Course = course
}

// UpdateSpeed updates the current speed
func (s *Simulator) UpdateSpeed(speed float64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.state.Speed = speed
}

// UpdateCourse updates the current course
func (s *Simulator) UpdateCourse(course float64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.state.Course = course
}

// LoadRTZRoute loads a route from RTZ XML data
func (s *Simulator) LoadRTZRoute(rtzData []byte, initialSpeed float64) error {
	var rtz rtzRoute
	if err := xml.Unmarshal(rtzData, &rtz); err != nil {
		return fmt.Errorf("failed to parse RTZ data: %w", err)
	}

	if len(rtz.Waypoints) == 0 {
		return fmt.Errorf("no waypoints found in RTZ file")
	}

	route := &RTZRoute{
		Waypoints: make([]Waypoint, len(rtz.Waypoints)),
	}

	for i, wp := range rtz.Waypoints {
		route.Waypoints[i] = Waypoint{
			ID:        wp.ID,
			Latitude:  wp.Position.Latitude,
			Longitude: wp.Position.Longitude,
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.route = route
	s.autoNavigate = true

	// Set initial position to first waypoint
	firstWP := route.Waypoints[0]
	s.state.Position = Position{
		Latitude:  firstWP.Latitude,
		Longitude: firstWP.Longitude,
		Timestamp: time.Now().UTC(),
	}
	s.state.Speed = initialSpeed

	// FIX: Set currentWaypoint to the target waypoint (next waypoint to reach)
	if len(route.Waypoints) > 1 {
		s.currentWaypoint = 1 // Target the second waypoint
		s.state.Course = s.calculateCourse(firstWP.Latitude, firstWP.Longitude,
			route.Waypoints[1].Latitude, route.Waypoints[1].Longitude)
	} else {
		// Single waypoint route - already at destination
		s.currentWaypoint = 0
		s.autoNavigate = false
	}

	return nil
}

// Start begins the NMEA transmission
func (s *Simulator) Start() error {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return fmt.Errorf("simulator is already running")
	}
	s.running = true
	s.stopChan = make(chan struct{})
	s.mu.Unlock()

	go s.simulationLoop()
	go s.transmissionLoop()

	return nil
}

// Stop stops the NMEA transmission
func (s *Simulator) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		s.running = false
		close(s.stopChan)
	}
}

// Close closes the simulator and releases resources
func (s *Simulator) Close() error {
	s.Stop()
	return s.conn.Close()
}

// simulationLoop updates the position based on speed and course
func (s *Simulator) simulationLoop() {
	ticker := time.NewTicker(1 * time.Second) // Update position every second
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			return
		case <-ticker.C:
			s.updatePosition()
		}
	}
}

// calculateCrossTrackError calculates how far off the intended track the vessel is
func (s *Simulator) calculateCrossTrackError() float64 {
	if s.route == nil || s.currentWaypoint == 0 || s.currentWaypoint >= len(s.route.Waypoints) {
		return 0
	}

	// Get the previous waypoint and current target waypoint
	prevWP := s.route.Waypoints[s.currentWaypoint-1]
	targetWP := s.route.Waypoints[s.currentWaypoint]
	currentPos := s.state.Position

	// Calculate the great circle distance from current position to the intended track
	// This is a simplified cross-track error calculation

	// Distance from previous waypoint to current position
	d13 := s.calculateDistance(prevWP.Latitude, prevWP.Longitude,
		currentPos.Latitude, currentPos.Longitude)

	// Bearing from previous waypoint to current position
	θ13 := s.calculateCourse(prevWP.Latitude, prevWP.Longitude,
		currentPos.Latitude, currentPos.Longitude) * math.Pi / 180

	// Bearing from previous waypoint to target waypoint
	θ12 := s.calculateCourse(prevWP.Latitude, prevWP.Longitude,
		targetWP.Latitude, targetWP.Longitude) * math.Pi / 180

	// Cross-track error in nautical miles (positive = right of track)
	dxt := math.Asin(math.Sin(d13/3440.065)*math.Sin(θ13-θ12)) * 3440.065

	return dxt
}

// updatePosition calculates new position based on current speed and course
func (s *Simulator) updatePosition() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.state.Speed <= 0 {
		return
	}

	// Time elapsed since last update (1 second)
	timeElapsed := 1.0 / 3600.0 // 1 second in hours

	// Distance traveled in nautical miles
	distanceNM := s.state.Speed * timeElapsed

	// Apply cross-track error correction if following a route
	courseToUse := s.state.Course
	if s.autoNavigate && s.route != nil && s.currentWaypoint > 0 {
		crossTrackError := s.calculateCrossTrackError()

		// Apply proportional correction (maximum 30 degrees correction)
		const maxCorrectionDegrees = 30.0
		const crossTrackGain = 10.0 // Degrees correction per NM of error

		correctionDegrees := math.Max(-maxCorrectionDegrees,
			math.Min(maxCorrectionDegrees, -crossTrackError*crossTrackGain))

		courseToUse = s.state.Course + correctionDegrees

		// Normalize course to 0-360
		if courseToUse < 0 {
			courseToUse += 360
		} else if courseToUse >= 360 {
			courseToUse -= 360
		}
	}

	// Calculate new position using the corrected course
	newLat, newLon := s.calculateNewPosition(
		s.state.Position.Latitude,
		s.state.Position.Longitude,
		courseToUse,
		distanceNM,
	)

	s.state.Position.Latitude = newLat
	s.state.Position.Longitude = newLon
	s.state.Position.Timestamp = time.Now().UTC()

	// Check if we're following a route and need to update course
	if s.autoNavigate && s.route != nil {
		s.checkWaypointProximity()
	}
}

// calculateNewPosition calculates new lat/lon given current position, course, and distance
func (s *Simulator) calculateNewPosition(lat, lon, course, distanceNM float64) (float64, float64) {
	const earthRadiusNM = 3440.065 // Earth radius in nautical miles

	latRad := lat * math.Pi / 180
	lonRad := lon * math.Pi / 180
	courseRad := course * math.Pi / 180
	distanceRad := distanceNM / earthRadiusNM

	newLatRad := math.Asin(math.Sin(latRad)*math.Cos(distanceRad) +
		math.Cos(latRad)*math.Sin(distanceRad)*math.Cos(courseRad))

	newLonRad := lonRad + math.Atan2(
		math.Sin(courseRad)*math.Sin(distanceRad)*math.Cos(latRad),
		math.Cos(distanceRad)-math.Sin(latRad)*math.Sin(newLatRad))

	newLat := newLatRad * 180 / math.Pi
	newLon := newLonRad * 180 / math.Pi

	// Normalize longitude to -180 to 180
	if newLon > 180 {
		newLon -= 360
	} else if newLon < -180 {
		newLon += 360
	}

	return newLat, newLon
}

// calculateCourse calculates the course between two points
func (s *Simulator) calculateCourse(lat1, lon1, lat2, lon2 float64) float64 {
	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLonRad := (lon2 - lon1) * math.Pi / 180

	y := math.Sin(deltaLonRad) * math.Cos(lat2Rad)
	x := math.Cos(lat1Rad)*math.Sin(lat2Rad) - math.Sin(lat1Rad)*math.Cos(lat2Rad)*math.Cos(deltaLonRad)

	courseRad := math.Atan2(y, x)
	course := courseRad * 180 / math.Pi

	// Normalize to 0-360
	if course < 0 {
		course += 360
	}

	return course
}

// calculateDistance calculates distance between two points in nautical miles
func (s *Simulator) calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusNM = 3440.065

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLatRad := (lat2 - lat1) * math.Pi / 180
	deltaLonRad := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(deltaLatRad/2)*math.Sin(deltaLatRad/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(deltaLonRad/2)*math.Sin(deltaLonRad/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusNM * c
}

// checkWaypointProximity checks if we're close to the target waypoint and advances if needed
func (s *Simulator) checkWaypointProximity() {
	if s.route == nil || s.currentWaypoint >= len(s.route.Waypoints) {
		return
	}

	// FIX: Check distance to the target waypoint (where we're going)
	targetWP := s.route.Waypoints[s.currentWaypoint]
	distance := s.calculateDistance(
		s.state.Position.Latitude, s.state.Position.Longitude,
		targetWP.Latitude, targetWP.Longitude,
	)

	// FIX: If within proximity threshold, advance to next waypoint
	const proximityThresholdNM = 0.02 // Reduced from 0.1 for better accuracy

	if distance < proximityThresholdNM {
		// Check if there's a next waypoint to navigate to
		if s.currentWaypoint < len(s.route.Waypoints)-1 {
			// Advance to next waypoint
			s.currentWaypoint++
			nextTargetWP := s.route.Waypoints[s.currentWaypoint]

			// Update course to the new target waypoint
			s.state.Course = s.calculateCourse(
				s.state.Position.Latitude, s.state.Position.Longitude,
				nextTargetWP.Latitude, nextTargetWP.Longitude,
			)
		} else {
			// Reached final waypoint - stop auto navigation
			s.autoNavigate = false
			s.state.Speed = 0 // Optional: stop the vessel
		}
	}
}

// transmissionLoop sends NMEA sentences at the specified rate
func (s *Simulator) transmissionLoop() {
	ticker := time.NewTicker(s.transmitRate)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			return
		case <-ticker.C:
			s.transmitNMEASentences()
		}
	}
}

// transmitNMEASentences generates and transmits NMEA sentences
func (s *Simulator) transmitNMEASentences() {
	s.mu.RLock()
	state := s.state
	s.mu.RUnlock()

	sentences := []string{
		s.generateGGA(state),
		s.generateRMC(state),
		s.generateGLL(state),
		s.generateVTG(state),
		s.generateGSA(state),
		s.generateGSV(state),
	}

	for _, sentence := range sentences {
		if sentence != "" {
			s.conn.Write([]byte(sentence + "\r\n"))
		}
	}
}

// NMEA sentence generators

// generateGGA generates a GGA (Global Positioning System Fix Data) sentence
func (s *Simulator) generateGGA(state NavigationState) string {
	timeStr := state.Position.Timestamp.Format("150405.00")
	latStr := s.formatLatitude(state.Position.Latitude)
	lonStr := s.formatLongitude(state.Position.Longitude)

	sentence := fmt.Sprintf("GPGGA,%s,%s,%s,%d,%02d,%.1f,%.1f,M,0.0,M,,",
		timeStr, latStr, lonStr, state.FixQuality, state.Satellites, state.HDOP, state.Altitude)

	return s.addChecksum(sentence)
}

// generateRMC generates an RMC (Recommended Minimum) sentence
func (s *Simulator) generateRMC(state NavigationState) string {
	timeStr := state.Position.Timestamp.Format("150405.00")
	dateStr := state.Position.Timestamp.Format("020106")
	latStr := s.formatLatitude(state.Position.Latitude)
	lonStr := s.formatLongitude(state.Position.Longitude)

	sentence := fmt.Sprintf("GPRMC,%s,A,%s,%s,%.1f,%.1f,%s,%.1f,E",
		timeStr, latStr, lonStr, state.Speed, state.Course, dateStr, math.Abs(state.MagneticVar))

	return s.addChecksum(sentence)
}

// generateGLL generates a GLL (Geographic Position) sentence
func (s *Simulator) generateGLL(state NavigationState) string {
	timeStr := state.Position.Timestamp.Format("150405.00")
	latStr := s.formatLatitude(state.Position.Latitude)
	lonStr := s.formatLongitude(state.Position.Longitude)

	sentence := fmt.Sprintf("GPGLL,%s,%s,%s,A",
		latStr, lonStr, timeStr)

	return s.addChecksum(sentence)
}

// generateVTG generates a VTG (Track Made Good and Ground Speed) sentence
func (s *Simulator) generateVTG(state NavigationState) string {
	magneticCourse := state.Course + state.MagneticVar
	if magneticCourse > 360 {
		magneticCourse -= 360
	} else if magneticCourse < 0 {
		magneticCourse += 360
	}

	speedKmh := state.Speed * 1.852 // Convert knots to km/h

	sentence := fmt.Sprintf("GPVTG,%.1f,T,%.1f,M,%.1f,N,%.1f,K",
		state.Course, magneticCourse, state.Speed, speedKmh)

	return s.addChecksum(sentence)
}

// generateGSA generates a GSA (GPS DOP and active satellites) sentence
func (s *Simulator) generateGSA(state NavigationState) string {
	sentence := fmt.Sprintf("GPGSA,A,3,01,02,03,04,05,06,07,08,,,,,%.1f,%.1f,%.1f",
		state.HDOP*1.5, state.HDOP, state.HDOP*0.8) // PDOP, HDOP, VDOP

	return s.addChecksum(sentence)
}

// generateGSV generates a GSV (GPS Satellites in view) sentence
func (s *Simulator) generateGSV(state NavigationState) string {
	// Simplified GSV with simulated satellite data
	sentence := fmt.Sprintf("GPGSV,2,1,08,01,45,045,45,02,30,120,42,03,60,180,48,04,15,270,35")
	return s.addChecksum(sentence)
}

// Helper functions for NMEA formatting

// formatLatitude formats latitude for NMEA (DDMM.MMMM,N/S)
func (s *Simulator) formatLatitude(lat float64) string {
	var hemisphere string
	if lat >= 0 {
		hemisphere = "N"
	} else {
		hemisphere = "S"
		lat = -lat
	}

	degrees := int(lat)
	minutes := (lat - float64(degrees)) * 60

	return fmt.Sprintf("%02d%07.4f,%s", degrees, minutes, hemisphere)
}

// formatLongitude formats longitude for NMEA (DDDMM.MMMM,E/W)
func (s *Simulator) formatLongitude(lon float64) string {
	var hemisphere string
	if lon >= 0 {
		hemisphere = "E"
	} else {
		hemisphere = "W"
		lon = -lon
	}

	degrees := int(lon)
	minutes := (lon - float64(degrees)) * 60

	return fmt.Sprintf("%03d%07.4f,%s", degrees, minutes, hemisphere)
}

// addChecksum adds NMEA checksum to a sentence
func (s *Simulator) addChecksum(sentence string) string {
	checksum := 0
	for i := 0; i < len(sentence); i++ {
		checksum ^= int(sentence[i])
	}
	return fmt.Sprintf("$%s*%02X", sentence, checksum)
}

// GetCurrentState returns the current navigation state (thread-safe)
func (s *Simulator) GetCurrentState() NavigationState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.state
}

// GetRoute returns the current route if loaded
func (s *Simulator) GetRoute() *RTZRoute {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.route
}

// IsRunning returns whether the simulator is currently running
func (s *Simulator) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.running
}

// GetCurrentWaypoint returns the current target waypoint index
func (s *Simulator) GetCurrentWaypoint() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentWaypoint
}

// GetWaypointCount returns the total number of waypoints in the route
func (s *Simulator) GetWaypointCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.route == nil {
		return 0
	}
	return len(s.route.Waypoints)
}

// AdvanceToNextWaypoint manually advances to the next waypoint
func (s *Simulator) AdvanceToNextWaypoint() bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.route == nil || s.currentWaypoint >= len(s.route.Waypoints)-1 {
		return false
	}

	// Move to the current waypoint position before advancing
	currentWP := s.route.Waypoints[s.currentWaypoint]
	s.state.Position = Position{
		Latitude:  currentWP.Latitude,
		Longitude: currentWP.Longitude,
		Timestamp: time.Now().UTC(),
	}

	s.currentWaypoint++

	if s.currentWaypoint < len(s.route.Waypoints) {
		targetWP := s.route.Waypoints[s.currentWaypoint]
		s.state.Course = s.calculateCourse(
			s.state.Position.Latitude, s.state.Position.Longitude,
			targetWP.Latitude, targetWP.Longitude,
		)
	} else {
		s.autoNavigate = false
		s.state.Speed = 0
	}

	return true
}

// GoToPreviousWaypoint manually goes to the previous waypoint
func (s *Simulator) GoToPreviousWaypoint() bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.route == nil || s.currentWaypoint <= 1 {
		return false
	}

	s.currentWaypoint--
	s.autoNavigate = true

	// Move to the previous waypoint position
	prevWP := s.route.Waypoints[s.currentWaypoint-1]
	s.state.Position = Position{
		Latitude:  prevWP.Latitude,
		Longitude: prevWP.Longitude,
		Timestamp: time.Now().UTC(),
	}

	// Set course to the target waypoint
	targetWP := s.route.Waypoints[s.currentWaypoint]
	s.state.Course = s.calculateCourse(
		s.state.Position.Latitude, s.state.Position.Longitude,
		targetWP.Latitude, targetWP.Longitude,
	)

	return true
}

// SetCurrentWaypoint manually sets the current target waypoint
func (s *Simulator) SetCurrentWaypoint(waypointIndex int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.route == nil || waypointIndex < 1 || waypointIndex >= len(s.route.Waypoints) {
		return false
	}

	// Move to the previous waypoint position (where vessel should be)
	prevWP := s.route.Waypoints[waypointIndex-1]
	s.state.Position = Position{
		Latitude:  prevWP.Latitude,
		Longitude: prevWP.Longitude,
		Timestamp: time.Now().UTC(),
	}

	s.currentWaypoint = waypointIndex
	s.autoNavigate = true

	// Set course to the target waypoint
	targetWP := s.route.Waypoints[s.currentWaypoint]
	s.state.Course = s.calculateCourse(
		s.state.Position.Latitude, s.state.Position.Longitude,
		targetWP.Latitude, targetWP.Longitude,
	)

	return true
}

// GetWaypointInfo returns current waypoint status information
func (s *Simulator) GetWaypointInfo() WaypointInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	info := WaypointInfo{
		CurrentWaypoint: s.currentWaypoint,
		AutoNavigate:    s.autoNavigate,
	}

	if s.route != nil {
		info.TotalWaypoints = len(s.route.Waypoints)
		if s.currentWaypoint >= 0 && s.currentWaypoint < len(s.route.Waypoints) {
			targetWP := s.route.Waypoints[s.currentWaypoint]
			info.TargetWaypoint = &targetWP
			info.DistanceToTarget = s.calculateDistance(
				s.state.Position.Latitude, s.state.Position.Longitude,
				targetWP.Latitude, targetWP.Longitude,
			)
		}
	}

	return info
}
