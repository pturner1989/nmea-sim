// App.tsx
import { useState, useEffect } from 'react';
import { StartManualSimulation, StartRTZSimulation, StopSimulation, UpdateSpeed, UpdateCourse, GetStatus, OpenFileDialog, ValidateRTZFile, AdvanceWaypoint, PreviousWaypoint, GetWaypointStatus, PauseSimulation, ResumeSimulation } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import SimulationSetup from './components/SimulationSetup';
import MonitoringInterface from './components/MonitoringInterface';
import { SimulationStatus, ManualConfig, RTZConfig } from './types';
import './App.css';

type AppState = 'setup' | 'monitoring';

function App() {
  const [appState, setAppState] = useState<AppState>('setup');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [lastSpeed, setLastSpeed] = useState<number>(8);
  const [status, setStatus] = useState<SimulationStatus>({
    isRunning: false,
    mode: 'manual',
    position: { 
      latitude: 0, 
      longitude: 0, 
      timestamp: new Date().toISOString() 
    },
    speed: 0,
    course: 0
  });
  const [startupRTZFile, setStartupRTZFile] = useState<string | null>(null);

  // Status polling
  useEffect(() => {
    const interval = setInterval(async () => {
      if (status.isRunning) {
        try {
          const newStatus = await GetStatus();
          // Also get waypoint status if in RTZ mode and running
          let waypointStatus = undefined;
          if (newStatus.mode === 'rtz' && newStatus.isRunning) {
            try {
              waypointStatus = await GetWaypointStatus();
            } catch (error) {
              console.error('Failed to get waypoint status:', error);
            }
          }

          // Convert the response to our expected format
          setStatus({
            isRunning: newStatus.isRunning || false,
            mode: newStatus.mode || 'manual',
            position: {
              latitude: newStatus.position?.latitude || 0,
              longitude: newStatus.position?.longitude || 0,
              timestamp: newStatus.position?.timestamp || new Date().toISOString()
            },
            speed: newStatus.speed || 0,
            course: newStatus.course || 0,
            route: newStatus.route as any, // Use 'as any' to avoid type conflicts
            waypointStatus: waypointStatus as any
          });
        } catch (error) {
          console.error('Failed to get status:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status.isRunning]);

  useEffect(() => {
    // Listen for backend event
    const off = EventsOn("openRTZFile", (filePath: string) => {
      setStartupRTZFile(filePath);
      // Auto-start RTZ simulation with default settings when opened from file association
      handleAutoStartRTZ(filePath);
    });
    return () => { off(); };
  }, []);

  const handleAutoStartRTZ = async (filePath: string) => {
    try {
      // Validate the file first
      await handleValidateFile(filePath);
      // Start with default speed
      const config: RTZConfig = {
        filePath: filePath,
        speed: 12
      };
      await StartRTZSimulation(config);
      setStatus(prev => ({ ...prev, isRunning: true, mode: 'rtz' }));
      setLastSpeed(12);
      setAppState('monitoring');
      showToast('RTZ simulation started from file association', 'success');
    } catch (error) {
      showToast(`Failed to start RTZ simulation: ${error}`, 'error');
      // If auto-start fails, show setup screen with the file pre-selected
      setAppState('setup');
    }
  };

  const handleStartManual = async (config: ManualConfig) => {
    try {
      await StartManualSimulation(config);
      setStatus(prev => ({ ...prev, isRunning: true, mode: 'manual' }));
      setLastSpeed(config.speed);
      setAppState('monitoring');
      showToast('Manual simulation started', 'success');
    } catch (error) {
      showToast(`Failed to start simulation: ${error}`, 'error');
    }
  };

  const handleStartRTZ = async (config: RTZConfig) => {
    try {
      await StartRTZSimulation(config);
      setStatus(prev => ({ ...prev, isRunning: true, mode: 'rtz' }));
      setLastSpeed(config.speed);
      setAppState('monitoring');
      showToast('RTZ simulation started', 'success');
    } catch (error) {
      showToast(`Failed to start simulation: ${error}`, 'error');
    }
  };


  const handlePause = async () => {
    try {
      setLastSpeed(status.speed);
      await PauseSimulation();
      setIsPaused(true);
      showToast('Simulation paused', 'info');
    } catch (error) {
      showToast(`Failed to pause simulation: ${error}`, 'error');
    }
  };

  const handleResume = async () => {
    try {
      await ResumeSimulation(lastSpeed);
      setIsPaused(false);
      showToast('Simulation resumed', 'success');
    } catch (error) {
      showToast(`Failed to resume simulation: ${error}`, 'error');
    }
  };

  const handleNewSimulation = async () => {
    // Stop current simulation if running
    if (status.isRunning) {
      try {
        await StopSimulation();
        setStatus(prev => ({ ...prev, isRunning: false }));
        setIsPaused(false);
        showToast('Simulation stopped', 'info');
      } catch (error) {
        showToast(`Failed to stop simulation: ${error}`, 'error');
      }
    }
    
    setAppState('setup');
    setStartupRTZFile(null);
  };

  const handleUpdateSpeed = async (speed: number) => {
    try {
      await UpdateSpeed(speed);
      showToast(`Speed updated to ${speed} knots`, 'success');
    } catch (error) {
      showToast(`Failed to update speed: ${error}`, 'error');
    }
  };

  const handleUpdateCourse = async (course: number) => {
    try {
      await UpdateCourse(course);
      showToast(`Course updated to ${course}°`, 'success');
    } catch (error) {
      showToast(`Failed to update course: ${error}`, 'error');
    }
  };

  const handleFileSelect = async (): Promise<string> => {
    try {
      const filePath = await OpenFileDialog();
      return filePath || ''; // Return empty string if user cancelled
    } catch (error) {
      console.error('File dialog error:', error);
      showToast(`Failed to open file dialog: ${error}`, 'error');
      return '';
    }
  };

  const handleValidateFile = async (filePath: string): Promise<any> => {
    try {
      const validation = await ValidateRTZFile(filePath);
      return validation;
    } catch (error) {
      console.error('File validation error:', error);
      throw error;
    }
  };

  const handleAdvanceWaypoint = async () => {
    try {
      await AdvanceWaypoint();
      showToast('Advanced to next waypoint', 'success');
    } catch (error) {
      showToast(`Failed to advance waypoint: ${error}`, 'error');
    }
  };

  const handlePreviousWaypoint = async () => {
    try {
      await PreviousWaypoint();
      showToast('Moved to previous waypoint', 'success');
    } catch (error) {
      showToast(`Failed to go to previous waypoint: ${error}`, 'error');
    }
  };


  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    // Toast notification implementation
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      info: 'bg-blue-600'
    };
    
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${colors[type]} text-white`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  if (appState === 'setup') {
    return (
      <SimulationSetup
        onStartManual={handleStartManual}
        onStartRTZ={handleStartRTZ}
        onUpdateSpeed={handleUpdateSpeed}
        onFileSelect={handleFileSelect}
        onValidateFile={handleValidateFile}
        onAdvanceWaypoint={handleAdvanceWaypoint}
        onPreviousWaypoint={handlePreviousWaypoint}
        startupFile={startupRTZFile}
      />
    );
  }

  return (
    <MonitoringInterface
      status={status}
      onPause={handlePause}
      onResume={handleResume}
      onNewSimulation={handleNewSimulation}
      onUpdateSpeed={handleUpdateSpeed}
      onUpdateCourse={handleUpdateCourse}
      onAdvanceWaypoint={handleAdvanceWaypoint}
      onPreviousWaypoint={handlePreviousWaypoint}
      isPaused={isPaused}
    />
  );
}

export default App;