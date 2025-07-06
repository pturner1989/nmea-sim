// src/components/StatusBar.tsx
import { StatusBarProps } from '../types';

const StatusBar: React.FC<StatusBarProps> = ({ status, onStart, onStop }) => {
  return (
    <div className="bg-gray-800 p-2 mb-2 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div 
              className={`w-3 h-3 rounded-full mr-2 ${
                status.isRunning ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-gray-300">
              {status.isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div className="text-gray-400">|</div>
          <div className="text-sm text-gray-400">
            Broadcasting on: <span className="text-blue-400 font-mono">127.0.0.1:10110</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {!status.isRunning ? (
            <button
              onClick={() => onStart({})}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Start Simulation
            </button>
          ) : (
            <button
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Stop Simulation
            </button>
          )}
        </div>
      </div>
      
      {/* Current Position Display */}
      {status.isRunning && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400 uppercase">Latitude</div>
            <div className="text-lg font-mono text-blue-400">
              {status.position.latitude.toFixed(6)}
            </div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400 uppercase">Longitude</div>
            <div className="text-lg font-mono text-blue-400">
              {status.position.longitude.toFixed(6)}
            </div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400 uppercase">Speed</div>
            <div className="text-lg font-mono text-green-400">
              {status.speed.toFixed(1)} kts
            </div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-xs text-gray-400 uppercase">Course</div>
            <div className="text-lg font-mono text-yellow-400">
              {status.course.toFixed(1)}°
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusBar;