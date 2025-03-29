/**
 * Test Visualization Component
 * 
 * This is a simple test visualization component that displays the data it receives.
 * It's useful for debugging the visualization loading system.
 */

function TestVisualization(props) {
  const { data, activeHighlights } = props;
  const containerRef = React.useRef(null);
  
  // Initialize the visualization when the component mounts or data changes
  React.useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear any existing content
    const container = containerRef.current;
    container.innerHTML = '';
    
    // Create a heading
    const heading = document.createElement('h2');
    heading.textContent = 'Test Visualization';
    heading.style.textAlign = 'center';
    heading.style.color = '#3b82f6';
    container.appendChild(heading);
    
    // Create a description
    const description = document.createElement('p');
    description.textContent = 'This is a simple test visualization to verify that the visualization loading system works.';
    description.style.textAlign = 'center';
    description.style.margin = '10px 0 20px';
    container.appendChild(description);
    
    // Display the data
    if (data && (data.nodes || data.edges)) {
      // Create a container for the data
      const dataContainer = document.createElement('div');
      dataContainer.style.display = 'flex';
      dataContainer.style.justifyContent = 'space-around';
      dataContainer.style.flexWrap = 'wrap';
      container.appendChild(dataContainer);
      
      // Display nodes
      if (data.nodes && data.nodes.length > 0) {
        const nodesContainer = document.createElement('div');
        nodesContainer.style.flex = '1';
        nodesContainer.style.minWidth = '300px';
        nodesContainer.style.margin = '10px';
        nodesContainer.style.padding = '15px';
        nodesContainer.style.backgroundColor = '#f1f5f9';
        nodesContainer.style.borderRadius = '8px';
        
        const nodesHeading = document.createElement('h3');
        nodesHeading.textContent = `Nodes (${data.nodes.length})`;
        nodesHeading.style.marginTop = '0';
        nodesContainer.appendChild(nodesHeading);
        
        const nodesList = document.createElement('ul');
        data.nodes.forEach(node => {
          const nodeItem = document.createElement('li');
          nodeItem.id = `node-${node.id}`;
          nodeItem.textContent = `${node.name || node.id} (${node.type || 'unknown'})`;
          
          // Highlight active nodes
          if (activeHighlights && activeHighlights.has(node.id)) {
            nodeItem.style.fontWeight = 'bold';
            nodeItem.style.color = '#2563eb';
          }
          
          nodesList.appendChild(nodeItem);
        });
        nodesContainer.appendChild(nodesList);
        dataContainer.appendChild(nodesContainer);
      }
      
      // Display edges
      if (data.edges && data.edges.length > 0) {
        const edgesContainer = document.createElement('div');
        edgesContainer.style.flex = '1';
        edgesContainer.style.minWidth = '300px';
        edgesContainer.style.margin = '10px';
        edgesContainer.style.padding = '15px';
        edgesContainer.style.backgroundColor = '#f1f5f9';
        edgesContainer.style.borderRadius = '8px';
        
        const edgesHeading = document.createElement('h3');
        edgesHeading.textContent = `Edges (${data.edges.length})`;
        edgesHeading.style.marginTop = '0';
        edgesContainer.appendChild(edgesHeading);
        
        const edgesList = document.createElement('ul');
        data.edges.forEach(edge => {
          const edgeItem = document.createElement('li');
          edgeItem.textContent = `${edge.source} → ${edge.target}`;
          edgesList.appendChild(edgeItem);
        });
        edgesContainer.appendChild(edgesList);
        dataContainer.appendChild(edgesContainer);
      }
    } else {
      // No data
      const noData = document.createElement('p');
      noData.textContent = 'No visualization data available.';
      noData.style.textAlign = 'center';
      noData.style.color = '#ef4444';
      container.appendChild(noData);
    }
    
    // Display active highlights
    if (activeHighlights && activeHighlights.size > 0) {
      const highlightsContainer = document.createElement('div');
      highlightsContainer.style.margin = '20px 10px';
      highlightsContainer.style.padding = '15px';
      highlightsContainer.style.backgroundColor = '#e0f2fe';
      highlightsContainer.style.borderRadius = '8px';
      
      const highlightsHeading = document.createElement('h3');
      highlightsHeading.textContent = 'Active Highlights';
      highlightsHeading.style.marginTop = '0';
      highlightsContainer.appendChild(highlightsHeading);
      
      const highlightsList = document.createElement('ul');
      Array.from(activeHighlights).forEach(id => {
        const highlightItem = document.createElement('li');
        highlightItem.textContent = id;
        highlightsList.appendChild(highlightItem);
      });
      highlightsContainer.appendChild(highlightsList);
      container.appendChild(highlightsContainer);
    }
  }, [data, activeHighlights]);
  
  return React.createElement("div", {
    ref: containerRef,
    style: {
      width: "100%",
      height: "100%",
      overflow: "auto",
      padding: "20px"
    }
  });
}

// Expose the component to the global window object with multiple naming conventions
window.testVisualization = TestVisualization;
window.TestVisualization = TestVisualization;
window.test_visualization = TestVisualization;

console.log('Test Visualization component loaded and exposed to window object'); 