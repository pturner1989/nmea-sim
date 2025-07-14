// src/components/MonitoringInterface.tsx
import { useState } from 'react';
import { SimulationStatus } from '../types';

interface MonitoringInterfaceProps {
  status: SimulationStatus;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onNewSimulation: () => void;
  onUpdateSpeed: (speed: number) => Promise<void>;
  onUpdateCourse: (course: number) => Promise<void>;
  onAdvanceWaypoint: () => Promise<void>;
  onPreviousWaypoint: () => Promise<void>;
  isPaused: boolean;
}

const MonitoringInterface: React.FC<MonitoringInterfaceProps> = ({
  status,
  onPause,
  onResume,
  onNewSimulation,
  onUpdateSpeed,
  onUpdateCourse,
  onAdvanceWaypoint,
  onPreviousWaypoint,
  isPaused
}) => {
  const [runtimeSpeed, setRuntimeSpeed] = useState<number>(8);
  const [runtimeCourse, setRuntimeCourse] = useState<number>(0);

  const handleUpdateSpeed = () => {
    if (runtimeSpeed < 0 || runtimeSpeed > 50) {
      alert('Invalid speed. Must be between 0 and 50 knots.');
      return;
    }
    onUpdateSpeed(runtimeSpeed);
  };

  const handleUpdateCourse = () => {
    if (runtimeCourse < 0 || runtimeCourse >= 360) {
      alert('Invalid course. Must be between 0 and 359 degrees.');
      return;
    }
    onUpdateCourse(runtimeCourse);
  };

  const handleKeyPress = (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      callback();
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <div className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-blue-400">NMEA Simulator</h1>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  status.isRunning && !isPaused ? 'bg-green-500' : 
                  isPaused ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-gray-300">
                  {!status.isRunning ? 'Stopped' : isPaused ? 'Paused' : 'Running'}
                </span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-sm text-gray-400">
                Mode: <span className="text-blue-400 capitalize">{status.mode}</span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-sm text-gray-400">
                Broadcasting: <span className="text-blue-400 font-mono">127.0.0.1:10110</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {status.isRunning && (
                <>
                  {!isPaused ? (
                    <button
                      onClick={onPause}
                      className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <span>⏸️</span>
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={onResume}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <span>▶️</span>
                      <span>Resume</span>
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={onNewSimulation}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>➕</span>
                <span>New</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Current Position Display */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="text-xs text-gray-400 uppercase mb-1">Latitude</div>
            <div className="text-2xl font-mono text-blue-400">
              {status.position.latitude.toFixed(6)}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="text-xs text-gray-400 uppercase mb-1">Longitude</div>
            <div className="text-2xl font-mono text-blue-400">
              {status.position.longitude.toFixed(6)}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="text-xs text-gray-400 uppercase mb-1">Speed</div>
            <div className="text-2xl font-mono text-green-400">
              {status.speed.toFixed(1)} kts
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="text-xs text-gray-400 uppercase mb-1">Course</div>
            <div className="text-2xl font-mono text-yellow-400">
              {status.course.toFixed(1)}°
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Speed Control */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-300 mb-4">Speed Control</h3>
            <div className="flex space-x-3">
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={runtimeSpeed}
                onChange={(e) => setRuntimeSpeed(parseFloat(e.target.value) || 0)}
                onKeyPress={handleKeyPress(handleUpdateSpeed)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Speed (knots)"
              />
              <button
                onClick={handleUpdateSpeed}
                disabled={isPaused}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 px-6 py-2 rounded-lg transition-colors"
              >
                Update
              </button>
            </div>
          </div>

          {/* Course Control - Only for Manual Mode */}
          {status.mode === 'manual' && (
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-medium text-gray-300 mb-4">Course Control</h3>
              <div className="flex space-x-3">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="359"
                  value={runtimeCourse}
                  onChange={(e) => setRuntimeCourse(parseFloat(e.target.value) || 0)}
                  onKeyPress={handleKeyPress(handleUpdateCourse)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Course (degrees)"
                />
                <button
                  onClick={handleUpdateCourse}
                  disabled={isPaused}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 px-6 py-2 rounded-lg transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RTZ Waypoint Controls */}
        {status.mode === 'rtz' && status.waypointStatus && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-medium text-gray-300 mb-4">Waypoint Navigation</h3>
            
            {/* Current Status */}
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Current Progress:</span>
                  <div className="text-white font-medium">
                    Waypoint {status.waypointStatus.currentWaypoint + 1} of {status.waypointStatus.totalWaypoints}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Distance to Target:</span>
                  <div className="text-white font-medium">
                    {status.waypointStatus.distanceToTarget?.toFixed(2)} NM
                  </div>
                </div>
              </div>
              
              {status.waypointStatus.targetWaypoint && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="text-xs text-gray-400">Target Waypoint:</div>
                  <div className="text-white font-mono text-sm">
                    {status.waypointStatus.targetWaypoint.id} ({status.waypointStatus.targetWaypoint.latitude.toFixed(6)}, {status.waypointStatus.targetWaypoint.longitude.toFixed(6)})
                  </div>
                </div>
              )}
              
              <div className="mt-2 flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${status.waypointStatus.autoNavigate ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                <span className="text-xs text-gray-400">
                  {status.waypointStatus.autoNavigate ? 'Auto Navigation Enabled' : 'Manual Navigation Mode'}
                </span>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex space-x-3">
              <button
                onClick={onPreviousWaypoint}
                disabled={status.waypointStatus.currentWaypoint <= 1 || isPaused}
                className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                title={status.waypointStatus.currentWaypoint <= 1 ? "Already at first waypoint" : "Go to previous waypoint"}
              >
                ← Previous
              </button>
              <button
                onClick={onAdvanceWaypoint}
                disabled={status.waypointStatus.currentWaypoint >= status.waypointStatus.totalWaypoints - 1 || isPaused}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                title={status.waypointStatus.currentWaypoint >= status.waypointStatus.totalWaypoints - 1 ? "Already at last waypoint" : "Skip to next waypoint"}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringInterface;