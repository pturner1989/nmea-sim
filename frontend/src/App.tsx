// App.tsx
import { useState, useEffect } from 'react';
import { StartManualSimulation, StartRTZSimulation, StopSimulation, UpdateSpeed, UpdateCourse, GetStatus, OpenFileDialog, ValidateRTZFile } from '../wailsjs/go/main/App';
import StatusBar from './components/StatusBar';
import ManualMode from './components/ManualMode';
import RTZMode from './components/RTZMode';
//import Sidebar from './components/Sidebar';
import { SimulationStatus, ManualConfig, RTZConfig } from './types';
import './App.css';

function App() {
  const [currentMode, setCurrentMode] = useState<'manual' | 'rtz'>('manual');
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

  // Status polling
  useEffect(() => {
    const interval = setInterval(async () => {
      if (status.isRunning) {
        try {
          const newStatus = await GetStatus();
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
            route: newStatus.route as any // Use 'as any' to avoid type conflicts
          });
        } catch (error) {
          console.error('Failed to get status:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status.isRunning]);

  const handleStartManual = async (config: ManualConfig) => {
    try {
      await StartManualSimulation(config);
      setStatus(prev => ({ ...prev, isRunning: true, mode: 'manual' }));
      showToast('Manual simulation started', 'success');
    } catch (error) {
      showToast(`Failed to start simulation: ${error}`, 'error');
    }
  };

  const handleStartRTZ = async (config: RTZConfig) => {
    try {
      await StartRTZSimulation(config);
      setStatus(prev => ({ ...prev, isRunning: true, mode: 'rtz' }));
      showToast('RTZ simulation started', 'success');
    } catch (error) {
      showToast(`Failed to start simulation: ${error}`, 'error');
    }
  };

  const handleStop = async () => {
    try {
      await StopSimulation();
      setStatus(prev => ({ ...prev, isRunning: false }));
      showToast('Simulation stopped', 'info');
    } catch (error) {
      showToast(`Failed to stop simulation: ${error}`, 'error');
    }
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

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Status Bar */}
        <StatusBar 
          status={status}
          onStart={currentMode === 'manual' ? handleStartManual : handleStartRTZ}
          onStop={handleStop}
        />

        {/* Tabs */}
        <div className="mb-2 px-4">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setCurrentMode('manual')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentMode === 'manual'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Manual Mode
              </button>
              <button
                onClick={() => setCurrentMode('rtz')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentMode === 'rtz'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                RTZ Route
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
                      {/* Main Panel */}
          <div className="lg:col-span-2">
            {currentMode === 'manual' ? (
              <ManualMode
                onStart={handleStartManual}
                onUpdateSpeed={handleUpdateSpeed}
                onUpdateCourse={handleUpdateCourse}
                isRunning={status.isRunning}
              />
            ) : (
              <RTZMode
                onStart={handleStartRTZ}
                onUpdateSpeed={handleUpdateSpeed}
                onFileSelect={handleFileSelect}
                onValidateFile={handleValidateFile}
                isRunning={status.isRunning}
              />
            )}
          </div>

          {/* Sidebar TBC */}
          {/* <div className="lg:col-span-1">
            <Sidebar 
              route={status.route}
              mode={currentMode}
            />
          </div> */}
        </div>
      </div>
      <div className='text-center pt-1 text-slate-300 text-xs'>Copyright - MaritimeDevs.org</div>
    </div>
  );
}

export default App;