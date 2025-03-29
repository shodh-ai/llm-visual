/**
 * Direct Import Script
 * 
 * This script directly imports the visualization components from src/components
 * and makes them available to the React application.
 */

// Define the paths to the visualization components
const VISUALIZATION_PATHS = {
  'er': '/src/components/ERVisualization.jsx',
  'document': '/src/components/DocumentVisualization.jsx',
  'hierarchical': '/src/components/HierarchicalVisualization.jsx',
  'entity': '/src/components/EntityVisualization.jsx',
  'attribute': '/src/components/AttributeVisualization.jsx',
  'shared_memory': '/src/components/Shared_memoryVisualization.jsx',
  'shared_disk': '/src/components/Shared_diskVisualization.jsx',
  'shared_nothing': '/src/components/Shared_nothingVisualization.jsx',
  'distributed_database': '/src/components/Distributed_databaseVisualization.jsx',
  'oop_concepts': '/src/components/Oop_conceptsVisualization.jsx',
  'relationalQuery': '/src/components/RelationalqueryVisualization.jsx',
  'normalization': '/src/components/NormalizationVisualization.jsx',
  'activedb': '/src/components/ActivedbVisualization.jsx',
  'queryprocessing': '/src/components/QueryprocessingVisualization.jsx',
  'mobiledb': '/src/components/MobiledbVisualization.jsx',
  'gis': '/src/components/GisVisualization.jsx',
  'businesspolicy': '/src/components/BusinessPolicyVisualization.jsx'
};

// Create a global object to store the visualization components
window.VISUALIZATIONS = {};

// Function to load a visualization component
async function loadVisualizationComponent(topic) {
  if (window.VISUALIZATIONS[topic]) {
    return window.VISUALIZATIONS[topic];
  }
  
  const path = VISUALIZATION_PATHS[topic];
  if (!path) {
    throw new Error(`No path found for topic: ${topic}`);
  }
  
  try {
    // Fetch the JSX file
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load component: ${path}`);
    }
    
    const jsxCode = await response.text();
    
    // Create a script element to transform and execute the JSX
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/babel';
      
      // Extract the component name from the path
      const fileName = path.split('/').pop().replace('.jsx', '');
      
      // Add a wrapper to expose the component to the window
      const wrappedCode = `
        ${jsxCode}
        
        // Try to find the component and expose it to the window
        try {
          // Look for the component in different ways
          let component = null;
          
          // Try with the exact component name
          if (typeof ${fileName} !== 'undefined') {
            component = ${fileName};
            console.log('Found component with exact name:', '${fileName}');
          } 
          // Try with window prefix
          else if (typeof window.${fileName} !== 'undefined') {
            component = window.${fileName};
            console.log('Found component with window prefix:', 'window.${fileName}');
          }
          // Try with capitalized first letter
          else if (typeof ${fileName.charAt(0).toUpperCase() + fileName.slice(1)} !== 'undefined') {
            component = ${fileName.charAt(0).toUpperCase() + fileName.slice(1)};
            console.log('Found component with capitalized name:', '${fileName.charAt(0).toUpperCase() + fileName.slice(1)}');
          }
          // Try with ERVisualization (common pattern)
          else if (typeof ERVisualization !== 'undefined') {
            component = ERVisualization;
            console.log('Found ERVisualization component');
          }
          // Try with topic name + Visualization
          else if (typeof ${topic.charAt(0).toUpperCase() + topic.slice(1)}Visualization !== 'undefined') {
            component = ${topic.charAt(0).toUpperCase() + topic.slice(1)}Visualization;
            console.log('Found component with topic name:', '${topic.charAt(0).toUpperCase() + topic.slice(1)}Visualization');
          }
          
          if (component) {
            window.VISUALIZATIONS['${topic}'] = component;
            console.log('Component loaded and exposed:', '${topic}');
          } else {
            // Create a fallback component
            window.VISUALIZATIONS['${topic}'] = (props) => {
              return React.createElement('div', {
                style: {
                  padding: '20px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  backgroundColor: '#f8f9fa'
                }
              }, [
                React.createElement('h3', {key: 'title'}, 'Fallback ${topic.charAt(0).toUpperCase() + topic.slice(1)} Visualization'),
                React.createElement('p', {key: 'desc'}, 'The original component could not be loaded. Displaying data as JSON:'),
                React.createElement('pre', {
                  key: 'data',
                  style: {
                    backgroundColor: '#eee',
                    padding: '10px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '300px'
                  }
                }, JSON.stringify(props.data, null, 2))
              ]);
            };
            console.warn('Created fallback component for:', '${topic}');
          }
        } catch (error) {
          console.error('Error exposing component to window:', error);
          // Create a fallback component
          window.VISUALIZATIONS['${topic}'] = (props) => {
            return React.createElement('div', {
              style: {
                padding: '20px',
                border: '1px solid #f00',
                borderRadius: '5px',
                backgroundColor: '#fff0f0'
              }
            }, [
              React.createElement('h3', {key: 'title'}, 'Error Loading ${topic.charAt(0).toUpperCase() + topic.slice(1)} Visualization'),
              React.createElement('p', {key: 'error'}, 'Error: ' + error.message),
              React.createElement('pre', {
                key: 'data',
                style: {
                  backgroundColor: '#eee',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '300px'
                }
              }, JSON.stringify(props.data, null, 2))
            ]);
          };
        }
      `;
      
      script.textContent = wrappedCode;
      
      // Handle script load
      script.onload = () => {
        console.log(`JSX component loaded: ${topic}`);
        
        // Check if the component was exposed to the window
        setTimeout(() => {
          if (window.VISUALIZATIONS[topic]) {
            resolve(window.VISUALIZATIONS[topic]);
          } else {
            reject(new Error(`Component not exposed to window: ${topic}`));
          }
        }, 500); // Give Babel time to process
      };
      
      script.onerror = (error) => {
        console.error(`Error loading JSX component: ${topic}`, error);
        reject(new Error(`Error loading JSX component: ${topic}`));
      };
      
      // Add the script to the document
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error(`Error loading visualization component: ${topic}`, error);
    throw error;
  }
}

// Function to get a visualization component
async function getVisualizationComponent(topic) {
  try {
    return await loadVisualizationComponent(topic);
  } catch (error) {
    console.error(`Error getting visualization component: ${topic}`, error);
    throw error;
  }
}

// Expose the functions to the window
window.loadVisualizationComponent = loadVisualizationComponent;
window.getVisualizationComponent = getVisualizationComponent;

console.log('Direct import script initialized'); 