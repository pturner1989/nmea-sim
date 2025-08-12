// src/components/SimulationSetup.tsx
import { useState } from 'react';
import ManualMode from './ManualMode';
import RTZMode from './RTZMode';
import { ManualConfig, RTZConfig } from '../types';

interface SimulationSetupProps {
  onStartManual: (config: ManualConfig) => Promise<void>;
  onStartRTZ: (config: RTZConfig) => Promise<void>;
  onUpdateSpeed: (speed: number) => Promise<void>;
  onFileSelect: () => Promise<string>;
  onValidateFile: (filePath: string) => Promise<any>;
  onAdvanceWaypoint: () => Promise<void>;
  onPreviousWaypoint: () => Promise<void>;
  startupFile?: string | null;
}

type SetupMode = 'selection' | 'manual' | 'rtz';

const SimulationSetup: React.FC<SimulationSetupProps> = ({
  onStartManual,
  onStartRTZ,
  onUpdateSpeed,
  onFileSelect,
  onValidateFile,
  onAdvanceWaypoint,
  onPreviousWaypoint,
  startupFile
}) => {
  const [mode, setMode] = useState<SetupMode>(startupFile ? 'rtz' : 'selection');

  const handleModeSelect = (selectedMode: 'manual' | 'rtz') => {
    setMode(selectedMode);
  };

  const handleBack = () => {
    setMode('selection');
  };

  if (mode === 'selection') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-blue-400 mb-4">NMEA Simulator</h1>
            <p className="text-xl text-gray-300">Choose your simulation type</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Manual Mode Selector */}
            <button
              onClick={() => handleModeSelect('manual')}
              className="group bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-blue-500 rounded-xl p-8 transition-all duration-300 transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  🧭
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Manual</h3>
                <p className="text-gray-400 leading-relaxed">
                  Set a fixed position, speed, and course. Perfect for testing specific coordinates or simulating stationary vessels.
                </p>
                <div className="mt-6 text-blue-400 font-medium">
                  Click to configure →
                </div>
              </div>
            </button>

            {/* RTZ Route Selector */}
            <button
              onClick={() => handleModeSelect('rtz')}
              className="group bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-green-500 rounded-xl p-8 transition-all duration-300 transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  🗺️
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Route File</h3>
                <p className="text-gray-400 leading-relaxed">
                  Load an RTZ route file and simulate vessel movement along predefined waypoints with automatic navigation.
                </p>
                <div className="mt-6 text-green-400 font-medium">
                  Click to configure →
                </div>
              </div>
            </button>
          </div>

          <div className="text-center mt-12">
            <div className="text-sm text-gray-500">
              NMEA data will be broadcast on <span className="text-blue-400 font-mono">127.0.0.1:10110</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-blue-400">
                {mode === 'manual' ? 'Manual Simulation' : 'Route File Simulation'}
              </h1>
              <p className="text-gray-400">
                {mode === 'manual' 
                  ? 'Configure position, speed, and heading' 
                  : 'Load and configure RTZ route file'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-gray-800 rounded-lg shadow-lg">
          {mode === 'manual' ? (
            <ManualMode
              onStart={onStartManual}
              onUpdateSpeed={onUpdateSpeed}
              onUpdateCourse={() => Promise.resolve()} // Not needed in setup
              isRunning={false}
            />
          ) : (
            <RTZMode
              onStart={onStartRTZ}
              onUpdateSpeed={onUpdateSpeed}
              onFileSelect={onFileSelect}
              onValidateFile={onValidateFile}
              onAdvanceWaypoint={onAdvanceWaypoint}
              onPreviousWaypoint={onPreviousWaypoint}
              isRunning={false}
              waypointStatus={undefined}
              startupFile={startupFile}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationSetup;