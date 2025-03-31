import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Server, Monitor, Clock, RefreshCw, Search } from 'lucide-react';

const BlackvireApp = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceActivity, setDeviceActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Fetch all devices
  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5200/api/devices');
      const data = await response.json();
      if (data.status === 'success') {
        setDevices(data.devices);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch activity for a specific IP
  const fetchActivity = async (ipAddress) => {
    try {
      const response = await fetch(`http://localhost:5200/api/activity/${ipAddress}`);
      const data = await response.json();
      if (data.status === 'success') {
        setDeviceActivity(data.activity);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  // Trigger network scan
  const startNetworkScan = async () => {
    setIsScanning(true);
    try {
      await fetch('http://localhost:5200/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ network: '192.168.1' }),
      });
      
      // Wait a bit and refresh the devices
      setTimeout(fetchDevices, 5200);
    } catch (error) {
      console.error('Error starting scan:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Load devices on component mount
  useEffect(() => {
    fetchDevices();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchDevices, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Load activity when a device is selected
  useEffect(() => {
    if (selectedDevice) {
      fetchActivity(selectedDevice.ip_address);
    }
  }, [selectedDevice]);

  // Filter devices based on search query
  const filteredDevices = devices.filter(device => 
    device.ip_address.includes(searchQuery) || 
    (device.domain && device.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (device.device_name && device.device_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Prepare chart data
  const chartData = deviceActivity.slice(0, 20).map(activity => ({
    time: new Date(activity.timestamp).toLocaleTimeString(),
    type: activity.request_type || 'connection',
  }));

  return (
    <div className="bg-gray-100 min-h-screen">
        <div className="bg-gray-100 min-h-screen">
        </div>

    <div className="bg-gray-100 min-h-screen ">
        
      {/* Header */}
      <header className="bg-black text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Server className="mr-2" />
            <h1 className="text-2xl font-bold">BLACKVIRE</h1>
            <span className="ml-2 text-sm opacity-75">IP-Based Activity Tracking</span>
          </div>
          <button 
            onClick={startNetworkScan}
            disabled={isScanning}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center"
          >
            <RefreshCw className={`mr-2 ${isScanning ? 'animate-spin' : ''}`} size={16} />
            {isScanning ? 'Scanning...' : 'Scan Network'}
          </button>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Device List Panel */}
          <div className="bg-white rounded-lg shadow-md p-4 md:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Monitor className="mr-2" size={18} />
                Connected Devices
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium py-1 px-2 rounded">
                {devices.length} devices
              </span>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-2 pl-10 border rounded-md"
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-96">
                {filteredDevices.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {filteredDevices.map((device) => (
                      <li 
                        key={device.id} 
                        className={`py-3 px-2 cursor-pointer hover:bg-gray-50 ${selectedDevice && selectedDevice.id === device.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedDevice(device)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{device.ip_address}</p>
                            <p className="text-sm text-gray-500">{device.domain || 'Unknown Domain'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">
                              <Clock className="inline mr-1" size={12} />
                              {new Date(device.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No devices found matching your search.
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Device Details Panel */}
          <div className="bg-white rounded-lg shadow-md p-4 md:col-span-2">
            {selectedDevice ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Device Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-500">IP Address</p>
                      <p className="font-medium">{selectedDevice.ip_address}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-500">Domain</p>
                      <p className="font-medium">{selectedDevice.domain || 'Unknown'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-500">MAC Address</p>
                      <p className="font-medium">{selectedDevice.mac_address || 'Unknown'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-500">Last Seen</p>
                      <p className="font-medium">{new Date(selectedDevice.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Activity className="mr-2" size={18} />
                    Activity History
                  </h3>
                  
                  {deviceActivity.length > 0 ? (
                    <>
                      <div className="mb-6 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="type" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {deviceActivity.map((activity) => (
                              <tr key={activity.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(activity.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {activity.request_type || 'Connection'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    {activity.status || 'Active'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      No activity recorded for this device yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                <Monitor size={48} className="mb-4" />
                <p>Select a device to view details and activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default BlackvireApp;