// src/components/RTZMode.tsx
import { useState, useEffect } from 'react';
import { RTZModeProps, RTZConfig } from '../types';

interface RTZModeWithStartup extends RTZModeProps {
  startupFile?: string | null;
}

const RTZMode: React.FC<RTZModeWithStartup> = ({ 
  onStart, 
  onUpdateSpeed, 
  onFileSelect,
  onValidateFile,
  isRunning,
  startupFile
}) => {
  const [config, setConfig] = useState<RTZConfig>({
    filePath: '',
    speed: 12
  });

  const [runtimeSpeed, setRuntimeSpeed] = useState<number>(8);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [validating] = useState<boolean>(false);

  useEffect(() => {
    if (startupFile && startupFile !== config.filePath) {
      (async () => {
        setConfig((c) => ({ ...c, filePath: startupFile }));
        const validate = await onValidateFile(startupFile);
        setFileInfo(validate);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startupFile]);

  const clearFileSelection = () => {
    setConfig({ ...config, filePath: '' });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isRunning) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (isRunning) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.rtz')) {
        // In browser environment, we can't get the full file path for security reasons
        // We'll show a message asking user to use the browse button instead
        alert('For drag & drop files, please use the Browse button to select the RTZ file. This ensures proper file path handling.');
      } else {
        alert('Please select a valid RTZ file (.rtz extension)');
      }
    }
  };

  const handleFileSelect = async () => {
    try {
      const filePath = await onFileSelect();
      if (filePath && filePath.trim() !== '') {
        setConfig({ ...config, filePath });
        // Show success message
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
        console.log(`Selected RTZ file: ${fileName}`);
        const validate = await onValidateFile(filePath);
        console.log("validated file", validate)
        setFileInfo(validate)
      }
      // If filePath is empty, user cancelled - no action needed
    } catch (error) {
      console.error('File selection failed:', error);
      alert(`Failed to select file: ${error}`);
    }
  };

  const validateAndStart = () => {
    if (!config.filePath || config.filePath.trim() === '') {
      alert('Please select an RTZ file first.');
      return;
    }
    
    // Check if file validation passed
    if (!fileInfo || !fileInfo.valid) {
      alert('Please select a valid RTZ file. The current file failed validation.');
      return;
    }
    
    if (config.speed < 0 || config.speed > 50) {
      alert('Invalid speed. Must be between 0 and 50 knots.');
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

  const handleKeyPress = (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      callback();
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-xl font-semibold mb-6 text-blue-400">RTZ Route Configuration</h2>
      
      <div className="space-y-6">
        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">RTZ Route File</label>
          <div 
            className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-900/20' 
                : 'border-gray-600 hover:border-gray-500'
            } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!isRunning ? handleFileSelect : undefined}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">📁</div>
              <div className="flex-1">
                {config.filePath ? (
                  <div>
                    <div className="text-white font-medium">
                      {config.filePath.split('/').pop() || config.filePath.split('\\').pop() || config.filePath}
                    </div>

        {/* File Information */}
        {config.filePath && (
          <div className={`p-3 rounded-lg ${
            validating 
              ? 'bg-yellow-900/30 border border-yellow-600' 
              : fileInfo?.valid 
              ? 'bg-green-900/30 border border-green-600' 
              : 'bg-red-900/30 border border-red-600'
          }`}>
            {validating ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                <span className="text-yellow-300">Validating RTZ file...</span>
              </div>
            ) : fileInfo?.valid ? (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-green-300 font-medium">Valid RTZ File</span>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  {fileInfo.routeName && (
                    <div><span className="text-gray-400">Route:</span> {fileInfo.routeName}</div>
                  )}
                  <div><span className="text-gray-400">Version:</span> {fileInfo.version || 'Unknown'}</div>
                  <div><span className="text-gray-400">Waypoints:</span> {fileInfo.waypointCount}</div>
                  <div><span className="text-gray-400">File Size:</span> {(fileInfo.fileSize / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-red-400">✗</span>
                  <span className="text-red-300 font-medium">Invalid RTZ File</span>
                </div>
                <div className="text-sm text-red-200">
                  {fileInfo?.error || 'Unknown validation error'}
                </div>
              </div>
            )}
          </div>
        )}
                    <div className="text-xs text-gray-400 break-all">
                      {config.filePath}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-gray-300">
                      {isDragOver ? 'Drop RTZ file here' : 'Click to browse or drag & drop RTZ file'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Supports RTZ 1.0/1.1 route files
                    </div>
                  </div>
                )}
              </div>
              {config.filePath && !isRunning && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFileSelection();
                  }}
                  className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded transition-colors text-sm"
                  title="Clear selection"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {/* Alternative Browse Button */}
          <div className="mt-2 flex space-x-2">
            <button
              onClick={handleFileSelect}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Browse Files
            </button>
            {config.filePath && (
              <div className="flex items-center text-xs text-green-400">
                <span className="mr-1">✓</span>
                File selected
              </div>
            )}
          </div>
        </div>

        {/* Speed */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Initial Speed (knots)
          </label>
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
          <div className="text-xs text-gray-500 mt-1">Speed will be maintained between waypoints</div>
        </div>

        {/* Route Preview */}
        {config.filePath && !isRunning && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Selected Route</h4>
            <div className="text-sm text-gray-400">
              <div className="font-mono text-xs bg-gray-800 p-2 rounded break-all">
                {config.filePath}
              </div>
            </div>
          </div>
        )}

        {/* Start Button */}
        {!isRunning && (
          <div className="pt-4">
            <button
              onClick={validateAndStart}
              disabled={!config.filePath || !fileInfo?.valid || validating}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 px-8 py-3 rounded-lg font-medium transition-colors"
            >
              {validating ? 'Validating...' : 'Start RTZ Simulation'}
            </button>
            {config.filePath && !fileInfo?.valid && !validating && (
              <div className="text-sm text-red-400 mt-2">
                Please select a valid RTZ file to start simulation
              </div>
            )}
          </div>
        )}

        {/* Runtime Speed Control */}
        {isRunning && (
          <div className="pt-6 border-t border-gray-700">
            <h3 className="text-lg font-medium text-gray-300 mb-4">Runtime Controls</h3>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default RTZMode;