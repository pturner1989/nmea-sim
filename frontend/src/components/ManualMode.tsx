// src/components/ManualMode.tsx
import { useState } from 'react';
import { ManualModeProps, ManualConfig } from '../types';

const ManualMode: React.FC<ManualModeProps> = ({ 
  onStart, 
  onUpdateSpeed, 
  onUpdateCourse, 
  isRunning 
}) => {
  const [config, setConfig] = useState<ManualConfig>({
    latitude: 50.883163,
    longitude: -1.395309,
    speed: 12,
    course: 90
  });

  const [runtimeSpeed, setRuntimeSpeed] = useState<number>(15);
  const [runtimeCourse, setRuntimeCourse] = useState<number>(180);

  const validateAndStart = () => {
    // Validation
    if (config.latitude < -90 || config.latitude > 90) {
      alert('Invalid latitude. Must be between -90 and 90.');
      return;
    }
    if (config.longitude < -180 || config.longitude > 180) {
      alert('Invalid longitude. Must be between -180 and 180.');
      return;
    }
    if (config.speed < 0 || config.speed > 50) {
      alert('Invalid speed. Must be between 0 and 50 knots.');
      return;
    }
    if (config.course < 0 || config.course >= 360) {
      alert('Invalid course. Must be between 0 and 360 degrees.');
      return;
    }

    onStart(config);
  };

  const handleUpdateSpeed = () => {
    if (runtimeSpeed < 0 || runtimeSpeed > 50) {
      alert('Invalid speed. Must be between 0 and 50 knots.');
      return;
    }
    onUpdateSpeed(runtimeSpeed);
  };

  const handleUpdateCourse = () => {
    if (runtimeCourse < 0 || runtimeCourse >= 360) {
      alert('Invalid course. Must be between 0 and 360 degrees.');
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
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-xl font-semibold mb-6 text-blue-400">Manual Configuration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Position */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-300">Starting Position</h3>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Latitude (decimal degrees)
            </label>
            <input
              type="number"
              step="0.000001"
              value={config.latitude}
              onChange={(e) => setConfig({ ...config, latitude: parseFloat(e.target.value) || 0 })}
              disabled={isRunning}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <div className="text-xs text-gray-500 mt-1">Example: 50.883163 (Southampton)</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Longitude (decimal degrees)
            </label>
            <input
              type="number"
              step="0.000001"
              value={config.longitude}
              onChange={(e) => setConfig({ ...config, longitude: parseFloat(e.target.value) || 0 })}
              disabled={isRunning}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <div className="text-xs text-gray-500 mt-1">Example: -1.395309 (Southampton)</div>
          </div>
        </div>

        {/* Movement */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-300">Movement Parameters</h3>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Speed (knots)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={config.speed}
              onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) || 0 })}
              disabled={isRunning}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <div className="text-xs text-gray-500 mt-1">0-50 knots</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Course (degrees true)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="360"
              value={config.course}
              onChange={(e) => setConfig({ ...config, course: parseFloat(e.target.value) || 0 })}
              disabled={isRunning}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <div className="text-xs text-gray-500 mt-1">0-360 degrees (0° = North, 90° = East)</div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      {!isRunning && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={validateAndStart}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Start Manual Simulation
          </button>
        </div>
      )}

      {/* Runtime Controls */}
      {isRunning && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-medium text-gray-300 mb-4">Runtime Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Update Speed</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={runtimeSpeed}
                  onChange={(e) => setRuntimeSpeed(parseFloat(e.target.value) || 0)}
                  onKeyPress={handleKeyPress(handleUpdateSpeed)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleUpdateSpeed}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Update Course</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="360"
                  value={runtimeCourse}
                  onChange={(e) => setRuntimeCourse(parseFloat(e.target.value) || 0)}
                  onKeyPress={handleKeyPress(handleUpdateCourse)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleUpdateCourse}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualMode;