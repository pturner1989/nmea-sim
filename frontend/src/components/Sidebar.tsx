// src/components/Sidebar.tsx
import { SidebarProps } from '../types';

const Sidebar: React.FC<SidebarProps> = ({ route, mode }) => {
  return (
    <div className="space-y-6">
      {/* Route Information */}
      {route && mode === 'rtz' && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-blue-400">Route Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Waypoints:</span>
              <span className="text-white">{route.waypoints?.length || 0}</span>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Waypoints</h4>
            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
              {route.waypoints?.map((waypoint: any) => (
                <div key={waypoint.id} className="text-xs bg-gray-700 rounded p-2">
                  <div className="font-medium text-white">{waypoint.id}</div>
                  <div className="text-gray-400">
                    {waypoint.latitude?.toFixed(4)}, {waypoint.longitude?.toFixed(4)}
                  </div>
                </div>
              )) || <div className="text-xs text-gray-500">No waypoints available</div>}
            </div>
          </div>
        </div>
      )}

      {/* Help Panel */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-400">How to Use</h3>
        <div className="space-y-4 text-sm text-gray-300">
          <div>
            <h4 className="font-medium text-white">Manual Mode:</h4>
            <p className="text-gray-400">
              Set a starting position, speed, and course. The simulator will move the vessel in a straight line.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white">RTZ Mode:</h4>
            <p className="text-gray-400">
              Load an RTZ route file. The simulator will automatically navigate through waypoints.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white">NMEA Output:</h4>
            <p className="text-gray-400">Listen on UDP port 10110 with:</p>
            <code className="block bg-gray-900 p-2 rounded mt-1 text-xs font-mono">
              nc -u -l 10110
            </code>
          </div>
          <div>
            <h4 className="font-medium text-white">Controls:</h4>
            <ul className="text-gray-400 list-disc list-inside space-y-1">
              <li>Use Tab key to switch between input fields</li>
              <li>Press Enter in speed/course fields to update values</li>
              <li>Runtime controls appear when simulation is running</li>
            </ul>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-400">System Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Host:</span>
            <span className="text-white font-mono">127.0.0.1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Port:</span>
            <span className="text-white font-mono">10110</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Protocol:</span>
            <span className="text-white">UDP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Format:</span>
            <span className="text-white">NMEA 0183</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">NMEA Sentences</h4>
          <div className="text-xs text-gray-400 space-y-1">
            <div>• GGA - GPS Fix Data</div>
            <div>• RMC - Recommended Minimum</div>
            <div>• GLL - Geographic Position</div>
            <div>• VTG - Track and Speed</div>
            <div>• GSA - Satellites and DOP</div>
            <div>• GSV - Satellites in View</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;