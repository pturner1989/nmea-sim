# NMEA Simulator

Simulate UDP NMEA output of a GPS device following a track. Useful for testing software that requires a GPS input.

Built with [Wails](https://github.com/wailsapp/wails)

## Features

### Manual Mode
- **Position Input**: Decimal latitude/longitude with validation
- **Speed Control**: 0-50 knots with real-time updates
- **Course Control**: 0-360 degrees with real-time updates
- **Runtime Updates**: Change speed and course while simulation is running

### RTZ Mode
- **File Selection**: Browse and select RTZ 1.0/1.1 files
- **Automatic Navigation**: Follow waypoints automatically
- **Speed Control**: Real-time speed updates during route following

### Real-time Features
- **Live Position Display**: Current lat/lon, speed, course
- **Status Indicators**: Visual indication of simulation state
- **NMEA Broadcasting**: UDP transmission on 127.0.0.1:10110
- **Error Handling**: User-friendly error messages and RTZ validation


## Setup Instructions

### 1. Install Wails

```bash
# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 2. Build and Run

```bash
# Development mode (with hot reload)
wails dev

# Build for production
wails build

# Build for specific platforms
wails build -platform linux/amd64
wails build -platform windows/amd64
wails build -platform darwin/amd64
```



## Usage

1. **Start the Application**: Run the built executable or use `wails dev`
2. **Choose Mode**: Select Manual or RTZ tab
3. **Configure Settings**: Enter position/route and speed
4. **Start Simulation**: Click "Start Simulation"
5. **Monitor Output**: Use `nc -u -l 10110` to see NMEA sentences
6. **Runtime Control**: Adjust speed/course while running

## NMEA Output

The application broadcasts standard NMEA 0183 sentences:
- **GGA**: GPS fix data
- **RMC**: Recommended minimum data
- **GLL**: Geographic position
- **VTG**: Track and speed
- **GSA**: GPS DOP and satellites
- **GSV**: GPS satellites in view

Listen with:
```bash
nc -u -l 10110
```
