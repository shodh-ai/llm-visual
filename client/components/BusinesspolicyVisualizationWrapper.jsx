import React, { useState, useEffect } from 'react';
import VisualizationController from './VisualizationController';
import BusinessPolicyVisualization from './BusinessPolicyVisualization';

const BusinessPolicyVisualizationWrapper = () => {
  const [visualizationData, setVisualizationData] = useState(null);
  const [scriptData, setScriptData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get server URL from config if available, otherwise use default
        const serverUrl = window.serverConfig ? window.serverConfig.getServerUrl() : window.location.origin;
        
        // Fetch visualization data
        const visualizationResponse = await fetch(`${serverUrl}/static/data/businesspolicy_visualization.json`);
        if (!visualizationResponse.ok) {
          throw new Error(`Failed to fetch visualization data: ${visualizationResponse.status}`);
        }
        const visualizationData = await visualizationResponse.json();
        
        // Fetch script data
        const scriptResponse = await fetch(`${serverUrl}/static/data/businesspolicy_script.json`);
        if (!scriptResponse.ok) {
          throw new Error(`Failed to fetch script data: ${scriptResponse.status}`);
        }
        const scriptData = await scriptResponse.json();
        
        // Combine data for the controller
        const combinedData = {
          ...visualizationData,
          narration: scriptData.script,
          narration_timestamps: scriptData.narration_timestamps,
          animation_states: scriptData.animation_states,
          component_mappings: scriptData.component_mappings
        };
        
        setVisualizationData(combinedData);
        setScriptData(scriptData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading visualization...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Visualization</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
        <style jsx>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            color: #e53e3e;
            text-align: center;
          }
          button {
            margin-top: 20px;
            padding: 8px 16px;
            background-color: #3182ce;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          button:hover {
            background-color: #2b6cb0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="businesspolicy-visualization-wrapper">
      <VisualizationController
        visualizationComponent={BusinessPolicyVisualization}
        data={visualizationData}
        topic="businesspolicy"
      />
    </div>
  );
};

export default BusinessPolicyVisualizationWrapper; 