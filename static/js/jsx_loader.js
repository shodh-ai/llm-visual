/**
 * JSX Component Loader
 * 
 * This utility helps load JSX visualization components from the static/components directory
 * and makes them available to the React application.
 */

class JSXLoader {
  constructor() {
    this.loadedComponents = {};
    this.loadingPromises = {};
    this.componentCache = {};
    this.baseUrl = window.location.origin;
    
    // Component mapping for direct access
    this.componentMapping = {
      'document': 'DocumentVisualization',
      'er': 'ERVisualization',
      'hierarchical': 'HierarchicalVisualization',
      'entity': 'EntityVisualization',
      'attribute': 'AttributeVisualization',
      'shared_memory': 'Shared_memoryVisualization',
      'shared_disk': 'Shared_diskVisualization',
      'shared_nothing': 'Shared_nothingVisualization',
      'distributed_database': 'Distributed_databaseVisualization',
      'oop_concepts': 'Oop_conceptsVisualization',
      'relationalQuery': 'RelationalqueryVisualization',
      'normalization': 'NormalizationVisualization',
      'activedb': 'ActivedbVisualization',
      'queryprocessing': 'QueryprocessingVisualization',
      'mobiledb': 'MobiledbVisualization',
      'gis': 'GisVisualization',
      'businesspolicy': 'BusinessPolicyVisualization'
    };
    
    // Initialize by checking for global components
    this._checkForGlobalComponents();
  }
  
  /**
   * Check for components already defined in the global scope
   * @private
   */
  _checkForGlobalComponents() {
    console.log('Checking for globally defined components...');
    for (const [topic, componentName] of Object.entries(this.componentMapping)) {
      if (window[componentName]) {
        console.log(`Found global component: ${componentName}`);
        this.componentCache[topic] = window[componentName];
      }
    }
  }

  /**
   * Load a JSX component by topic ID
   * @param {string} topic - The topic ID (e.g., 'er', 'shared_memory', etc.)
   * @returns {Promise} - A promise that resolves with the component
   */
  loadComponent(topic) {
    // If already loaded, return from cache
    if (this.componentCache[topic]) {
      console.log(`JSX component for ${topic} already loaded, returning from cache`);
      return Promise.resolve(this.componentCache[topic]);
    }

    // If already loading, return the existing promise
    if (this.loadingPromises[topic]) {
      console.log(`JSX component for ${topic} already loading, returning existing promise`);
      return this.loadingPromises[topic];
    }

    console.log(`Loading JSX component for topic: ${topic}`);

    // Create a promise to load the component
    this.loadingPromises[topic] = new Promise((resolve, reject) => {
      // Try to create a component directly using React.createElement
      const directComponent = this.createDirectComponent(topic);
      if (directComponent) {
        console.log(`Created direct component for ${topic}`);
        this.componentCache[topic] = directComponent;
        resolve(directComponent);
        return;
      }

      // If direct creation fails, try to load from static/components
      this.fetchJSXComponent(topic)
        .then(component => {
          console.log(`Successfully loaded JSX component for ${topic}`);
          this.componentCache[topic] = component;
          resolve(component);
        })
        .catch(error => {
          console.error(`Failed to load JSX component for ${topic}, creating fallback:`, error);
          // Create a fallback component
          const fallbackComponent = this.createFallbackComponent(topic);
          this.componentCache[topic] = fallbackComponent;
          resolve(fallbackComponent);
        });
    });

    return this.loadingPromises[topic];
  }

  /**
   * Create a direct component using React.createElement
   * @param {string} topic - The topic ID
   * @returns {Function|null} - The component or null if creation fails
   */
  createDirectComponent(topic) {
    try {
      // Get the component name from the mapping
      const componentName = this.componentMapping[topic];
      if (!componentName) {
        console.log(`No component mapping found for ${topic}`);
        return null;
      }
      
      // Check if the component is already available in the window object
      if (window[componentName]) {
        console.log(`Found component in window object: ${componentName}`);
        return window[componentName];
      }

      // Create a component that renders a placeholder with the data
      return (props) => {
        return React.createElement('div', {
          className: 'jsx-visualization',
          style: {
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: 'white',
            height: '100%',
            overflow: 'auto'
          }
        }, [
          React.createElement('h3', {
            key: 'title',
            style: {
              textAlign: 'center',
              marginBottom: '20px',
              color: '#333'
            }
          }, `${topic.charAt(0).toUpperCase() + topic.slice(1).replace('_', ' ')} Visualization`),
          
          // Visualization content based on the data
          this.renderVisualizationContent(topic, props.data)
        ]);
      };
    } catch (error) {
      console.error(`Error creating direct component for ${topic}:`, error);
      return null;
    }
  }

  /**
   * Render visualization content based on the topic and data
   * @param {string} topic - The topic ID
   * @param {Object} data - The visualization data
   * @returns {React.Element} - The visualization content
   */
  renderVisualizationContent(topic, data) {
    // Create visualization content based on the data structure
    try {
      // Extract entities and relationships from the data
      let entities = [];
      let relationships = [];
      
      if (data.entities && Array.isArray(data.entities)) {
        entities = data.entities;
      } else if (data.nodes && Array.isArray(data.nodes)) {
        entities = data.nodes;
      } else if (data.data && data.data.entities && Array.isArray(data.data.entities)) {
        entities = data.data.entities;
      }
      
      if (data.relationships && Array.isArray(data.relationships)) {
        relationships = data.relationships;
      } else if (data.links && Array.isArray(data.links)) {
        relationships = data.links;
      } else if (data.edges && Array.isArray(data.edges)) {
        relationships = data.edges;
      } else if (data.data && data.data.relationships && Array.isArray(data.data.relationships)) {
        relationships = data.data.relationships;
      }
      
      // Create entity elements
      const entityElements = entities.map((entity, index) => {
        return React.createElement('div', {
          key: `entity-${index}`,
          className: 'entity',
          style: {
            padding: '10px',
            margin: '10px',
            backgroundColor: '#69b3a2',
            color: 'white',
            borderRadius: '5px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            width: '200px',
            display: 'inline-block',
            verticalAlign: 'top'
          }
        }, [
          React.createElement('h4', { key: 'name' }, entity.name || entity.id || 'Entity'),
          React.createElement('p', { key: 'type' }, `Type: ${entity.type || 'Unknown'}`),
          React.createElement('p', { key: 'id' }, `ID: ${entity.id || 'Unknown'}`)
        ]);
      });
      
      // Create relationship elements
      const relationshipElements = relationships.map((rel, index) => {
        return React.createElement('div', {
          key: `rel-${index}`,
          className: 'relationship',
          style: {
            padding: '10px',
            margin: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'inline-block',
            verticalAlign: 'top'
          }
        }, [
          React.createElement('p', { key: 'source' }, `Source: ${rel.source}`),
          React.createElement('p', { key: 'target' }, `Target: ${rel.target}`),
          React.createElement('p', { key: 'type' }, `Type: ${rel.type || 'Unknown'}`)
        ]);
      });
      
      // Create the visualization container
      return React.createElement('div', { className: 'visualization-content' }, [
        React.createElement('div', { key: 'entities', className: 'entities-container' }, [
          React.createElement('h4', { key: 'title' }, 'Entities'),
          ...entityElements
        ]),
        React.createElement('div', { key: 'relationships', className: 'relationships-container' }, [
          React.createElement('h4', { key: 'title' }, 'Relationships'),
          ...relationshipElements
        ]),
        React.createElement('div', { key: 'data', className: 'data-container' }, [
          React.createElement('h4', { key: 'title' }, 'Raw Data'),
          React.createElement('pre', {
            style: {
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '5px',
              maxHeight: '200px',
              overflow: 'auto',
              fontSize: '12px'
            }
          }, JSON.stringify(data, null, 2))
        ])
      ]);
    } catch (error) {
      console.error('Error rendering visualization content:', error);
      return React.createElement('div', { className: 'error' }, [
        React.createElement('p', null, 'Error rendering visualization content'),
        React.createElement('pre', null, error.toString())
      ]);
    }
  }

  /**
   * Create a fallback component
   * @param {string} topic - The topic ID
   * @returns {Function} - The fallback component
   */
  createFallbackComponent(topic) {
    return (props) => {
      return React.createElement('div', {
        style: {
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          backgroundColor: '#f8f9fa'
        }
      }, [
        React.createElement('h3', {key: 'title'}, `${topic.charAt(0).toUpperCase() + topic.slice(1)} Visualization (Fallback)`),
        React.createElement('p', {key: 'desc'}, 'Using fallback visualization component'),
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

  /**
   * Fetch a JSX component from the static/components directory
   * @param {string} topic - The topic ID
   * @returns {Promise} - A promise that resolves with the component
   */
  fetchJSXComponent(topic) {
    return new Promise((resolve, reject) => {
      // Format the component name based on the topic
      const formattedTopic = topic.split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      
      // Try different naming conventions
      const possibleNames = [
        // Standard naming convention (e.g., ERVisualization)
        `${formattedTopic}Visualization`,
        
        // With underscore (e.g., Shared_memoryVisualization)
        `${topic.charAt(0).toUpperCase() + topic.slice(1)}Visualization`,
        
        // Direct match to file name
        `${topic}Visualization`,
        
        // All uppercase first letter (e.g., SharedMemoryVisualization)
        `${topic.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Visualization`
      ];
      
      // Try to load the component from static/components
      const possiblePaths = [
        `/static/components/${this.componentMapping[topic] || `${formattedTopic}Visualization`}.jsx`,
        `/static/components/${topic}Visualization.jsx`,
        `/static/components/${topic.charAt(0).toUpperCase() + topic.slice(1)}Visualization.jsx`
      ];
      
      console.log(`Trying to load JSX component from paths:`, possiblePaths);

      // Function to try loading a script
      const tryLoadScript = (index) => {
        if (index >= possiblePaths.length) {
          reject(new Error(`Could not find JSX component for ${topic}`));
          return;
        }

        const path = possiblePaths[index];
        console.log(`Attempting to load from: ${path}`);

        // Fetch the JSX file content
        fetch(path)
          .then(response => {
            if (!response.ok) {
              console.warn(`Failed to load from ${path}, trying next path`);
              tryLoadScript(index + 1);
              return null;
            }
            return response.text();
          })
          .then(jsxCode => {
            if (!jsxCode) return;
            
            console.log(`Successfully fetched JSX code from ${path}`);
            
            // Create a script element to load and transform the JSX
            const script = document.createElement('script');
            script.type = 'text/babel';
            
            // Add a wrapper to expose the component to the window
            const wrappedCode = `
              ${jsxCode}
              
              // Make sure the component is exposed to the window object
              if (typeof ${this.componentMapping[topic]} === 'function' && !window['${this.componentMapping[topic]}']) {
                window['${this.componentMapping[topic]}'] = ${this.componentMapping[topic]};
                console.log('Exposed component to window: ${this.componentMapping[topic]}');
              }
            `;
            
            // Set the script content
            script.textContent = wrappedCode;
            
            // Handle script load
            script.onload = () => {
              console.log(`Babel processed JSX for ${topic}`);
              
              // Check if the component was exposed to the window
              setTimeout(() => {
                if (window[this.componentMapping[topic]]) {
                  console.log(`Component found for ${topic}:`, window[this.componentMapping[topic]]);
                  resolve(window[this.componentMapping[topic]]);
                } else {
                  console.error(`Component not exposed to window: ${topic}`);
                  // Create a fallback component
                  const fallbackComponent = this.createFallbackComponent(topic);
                  resolve(fallbackComponent);
                }
              }, 500); // Give Babel time to process
            };
            
            script.onerror = (error) => {
              console.error(`Error processing JSX for ${topic}:`, error);
              tryLoadScript(index + 1);
            };
            
            // Add the script to the document
            document.head.appendChild(script);
          })
          .catch(error => {
            console.error(`Error fetching JSX from ${path}:`, error);
            tryLoadScript(index + 1);
          });
      };
      
      // Start trying to load from the first path
      tryLoadScript(0);
    });
  }

  /**
   * Check if a component is loaded
   * @param {string} topic - The topic ID
   * @returns {boolean} - True if the component is loaded
   */
  isComponentLoaded(topic) {
    return !!this.componentCache[topic];
  }

  /**
   * Get a list of loaded components
   * @returns {Array<string>} - Array of loaded component topic IDs
   */
  getLoadedComponents() {
    return Object.keys(this.componentCache);
  }

  /**
   * Get a component by topic
   * @param {string} topic - The topic ID
   * @returns {Function|null} - The component or null if not loaded
   */
  getComponent(topic) {
    return this.componentCache[topic] || null;
  }
}

// Create a singleton instance and expose it to the window
window.jsxLoader = new JSXLoader();
console.log('JSX Loader initialized'); 