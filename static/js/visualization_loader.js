/**
 * Visualization Loader Utility
 * 
 * This script helps load visualization data from the server
 * and provides utility functions for working with visualizations.
 */

class VisualizationLoader {
  constructor() {
    this.loadedData = {};
    this.loadingPromises = {};
    this.serverUrl = window.serverConfig ? window.serverConfig.getServerUrl() : window.location.origin;
    console.log('VisualizationLoader initialized with server URL:', this.serverUrl);
    
    // Initialize mock data for each topic
    this.mockData = {
      er: this._createERMockData(),
      document: this._createDocumentMockData(),
      hierarchical: this._createHierarchicalMockData(),
      // Add mock data for other topics as needed
    };
  }

  /**
   * Load visualization data for a topic
   * @param {string} topic - The topic ID (e.g., 'er', 'document', etc.)
   * @returns {Promise} - A promise that resolves with the visualization data
   */
  loadData(topic) {
    // If already loaded, return immediately
    if (this.loadedData[topic]) {
      console.log(`Using cached data for ${topic}`);
      return Promise.resolve(this.loadedData[topic]);
    }

    // If already loading, return the existing promise
    if (this.loadingPromises[topic]) {
      console.log(`Already loading data for ${topic}, returning existing promise`);
      return this.loadingPromises[topic];
    }

    // Log the full URL being used
    const apiUrl = `${this.serverUrl}/api/visualization`;
    console.log(`Fetching visualization data from: ${apiUrl} for topic: ${topic}`);

    // Start loading the data
    this.loadingPromises[topic] = fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic })
    })
    .then(response => {
      console.log(`API response for ${topic}:`, response.status, response.statusText);
      
      if (!response.ok) {
        // If the API returns 404, use mock data instead of throwing an error
        if (response.status === 404) {
          console.warn(`API endpoint not found (404). Using mock data for ${topic} instead.`);
          return this.loadMockData(topic);
        }
        throw new Error(`Failed to load visualization data: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log(`Loaded visualization data for ${topic}:`, data);
      this.loadedData[topic] = data;
      return data;
    })
    .catch(error => {
      console.error(`Error loading visualization data for ${topic}:`, error);
      
      // For debugging purposes, try a GET request to see if the endpoint exists
      console.log('Attempting GET request to check if endpoint exists...');
      fetch(`${this.serverUrl}/api`, { method: 'GET' })
        .then(response => console.log('API root endpoint response:', response.status, response.statusText))
        .catch(err => console.log('API root endpoint error:', err));
      
      // Use mock data as a fallback
      console.log(`Using mock data for ${topic} as fallback due to error`);
      return this.loadMockData(topic);
    });

    return this.loadingPromises[topic];
  }

  /**
   * Get loaded data for a topic
   * @param {string} topic - The topic ID
   * @returns {Object|null} - The visualization data or null if not loaded
   */
  getData(topic) {
    return this.loadedData[topic] || null;
  }

  /**
   * Check if data for a topic is loaded
   * @param {string} topic - The topic ID
   * @returns {boolean} - True if the data is loaded
   */
  isDataLoaded(topic) {
    return !!this.loadedData[topic];
  }

  /**
   * Get a list of all loaded topics
   * @returns {Array<string>} - Array of loaded topic IDs
   */
  getLoadedTopics() {
    return Object.keys(this.loadedData);
  }
  
  /**
   * Clear loaded data for a topic
   * @param {string} topic - The topic ID
   */
  clearData(topic) {
    delete this.loadedData[topic];
    delete this.loadingPromises[topic];
  }
  
  /**
   * Clear all loaded data
   */
  clearAllData() {
    this.loadedData = {};
    this.loadingPromises = {};
  }
  
  /**
   * Load mock data for testing when API is unavailable
   * @param {string} topic - The topic ID
   * @returns {Object} - Mock visualization data
   */
  loadMockData(topic) {
    console.log(`Loading mock data for ${topic}`);
    
    // Use predefined mock data if available, otherwise create generic mock data
    const mockData = this.mockData[topic] || this._createGenericMockData(topic);
    
    // Store in cache
    this.loadedData[topic] = mockData;
    delete this.loadingPromises[topic];
    return mockData;
  }
  
  /**
   * Create generic mock data for any topic
   * @param {string} topic - The topic ID
   * @returns {Object} - Generic mock data
   * @private
   */
  _createGenericMockData(topic) {
    return {
      nodes: [
        { id: 'node1', name: 'Node 1', type: 'entity' },
        { id: 'node2', name: 'Node 2', type: 'entity' },
        { id: 'node3', name: 'Node 3', type: 'relationship' }
      ],
      edges: [
        { source: 'node1', target: 'node3', type: 'connection' },
        { source: 'node3', target: 'node2', type: 'connection' }
      ],
      narration: `This is a mock visualization for ${topic}. The API endpoint is currently unavailable.`
    };
  }
  
  /**
   * Create mock data for ER diagram
   * @returns {Object} - ER mock data
   * @private
   */
  _createERMockData() {
    return {
      nodes: [
        { id: 'student', name: 'Student', type: 'entity', attributes: [
          { name: 'student_id', isKey: true },
          { name: 'name', isKey: false },
          { name: 'email', isKey: false }
        ]},
        { id: 'course', name: 'Course', type: 'entity', attributes: [
          { name: 'course_id', isKey: true },
          { name: 'title', isKey: false },
          { name: 'credits', isKey: false }
        ]},
        { id: 'enrollment', name: 'Enrolls', type: 'relationship' }
      ],
      edges: [
        { source: 'student', target: 'enrollment', cardinality: 'one_or_many' },
        { source: 'enrollment', target: 'course', cardinality: 'one_or_many' }
      ],
      narration: "This is a mock Entity-Relationship diagram showing the relationship between Students and Courses. Students can enroll in multiple courses, and courses can have multiple students enrolled."
    };
  }
  
  /**
   * Create mock data for Document database
   * @returns {Object} - Document DB mock data
   * @private
   */
  _createDocumentMockData() {
    return {
      nodes: [
        { id: 'users', name: 'Users Collection', type: 'collection' },
        { id: 'posts', name: 'Posts Collection', type: 'collection' },
        { id: 'comments', name: 'Comments Collection', type: 'collection' },
        { id: 'user1', name: 'User Document', type: 'document', parent: 'users' },
        { id: 'post1', name: 'Post Document', type: 'document', parent: 'posts' },
        { id: 'comment1', name: 'Comment Document', type: 'document', parent: 'comments' }
      ],
      edges: [
        { source: 'user1', target: 'post1', type: 'references' },
        { source: 'post1', target: 'comment1', type: 'embeds' },
        { source: 'comment1', target: 'user1', type: 'references' }
      ],
      narration: "This is a mock Document Database visualization showing the relationship between Users, Posts, and Comments collections. Posts reference Users, Comments are embedded in Posts, and Comments reference Users."
    };
  }
  
  /**
   * Create mock data for Hierarchical database
   * @returns {Object} - Hierarchical DB mock data
   * @private
   */
  _createHierarchicalMockData() {
    return {
      nodes: [
        { id: 'root', name: 'Root', type: 'segment' },
        { id: 'department', name: 'Department', type: 'segment' },
        { id: 'employee', name: 'Employee', type: 'segment' },
        { id: 'project', name: 'Project', type: 'segment' },
        { id: 'task', name: 'Task', type: 'segment' }
      ],
      edges: [
        { source: 'root', target: 'department', type: 'parent-child' },
        { source: 'department', target: 'employee', type: 'parent-child' },
        { source: 'department', target: 'project', type: 'parent-child' },
        { source: 'project', target: 'task', type: 'parent-child' }
      ],
      narration: "This is a mock Hierarchical Database visualization showing a typical organizational structure. The root contains departments, which contain employees and projects. Projects contain tasks."
    };
  }
}

// Create a singleton instance and expose it to the window
window.visualizationLoader = new VisualizationLoader();
console.log('Visualization loader initialized'); 