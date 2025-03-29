/**
 * Entity-Relationship Visualization Component
 * 
 * This component renders an ER diagram using D3.js
 */

// Define the ER visualization component
function ERVisualization(props) {
  const { data, activeHighlights } = props;
  const containerRef = React.useRef(null);
  const svgRef = React.useRef(null);
  const simulationRef = React.useRef(null);
  
  // Initialize the visualization when the component mounts or data changes
  React.useEffect(() => {
    if (!data || !data.nodes || !data.edges || !containerRef.current) {
      return;
    }
    
    // Clear any existing SVG
    d3.select(containerRef.current).selectAll("svg").remove();
    
    // Create SVG container
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
    
    svgRef.current = svg;
    
    // Create a group for all elements
    const g = svg.append("g");
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Define node colors based on type
    const nodeColors = {
      entity: "#4299e1",
      attribute: "#68d391",
      relationship: "#f6ad55",
      default: "#a0aec0"
    };
    
    // Create a force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges)
        .id(d => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(60));
    
    simulationRef.current = simulation;
    
    // Create links
    const links = g.selectAll(".link")
      .data(data.edges)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#cbd5e0")
      .attr("stroke-width", 1.5);
    
    // Create node groups
    const nodes = g.selectAll(".node")
      .data(data.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("id", d => `node-${d.id}`)
      .call(d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded));
    
    // Add rectangles for entities
    nodes.filter(d => d.type === "entity" || !d.type)
      .append("rect")
      .attr("width", 120)
      .attr("height", 60)
      .attr("x", -60)
      .attr("y", -30)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", d => nodeColors[d.type] || nodeColors.default)
      .attr("stroke", "#2c5282")
      .attr("stroke-width", 2);
    
    // Add circles for attributes
    nodes.filter(d => d.type === "attribute")
      .append("circle")
      .attr("r", 30)
      .attr("fill", nodeColors.attribute)
      .attr("stroke", "#276749")
      .attr("stroke-width", 2);
    
    // Add diamonds for relationships
    nodes.filter(d => d.type === "relationship")
      .append("polygon")
      .attr("points", "0,-40 40,0 0,40 -40,0")
      .attr("fill", nodeColors.relationship)
      .attr("stroke", "#c05621")
      .attr("stroke-width", 2);
    
    // Add text labels
    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "#1a202c")
      .attr("font-weight", "bold")
      .text(d => d.name);
    
    // Update positions on each tick
    simulation.on("tick", () => {
      links
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      nodes.attr("transform", d => `translate(${d.x}, ${d.y})`);
    });
    
    // Drag functions
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Apply initial highlights
    updateHighlights();
    
    // Return a cleanup function
    return () => {
      simulation.stop();
    };
  }, [data]);
  
  // Update highlights when activeHighlights changes
  React.useEffect(() => {
    updateHighlights();
  }, [activeHighlights]);
  
  // Function to update highlighted nodes
  function updateHighlights() {
    if (!svgRef.current || !activeHighlights) return;
    
    // Reset all nodes to normal appearance
    svgRef.current.selectAll(".node rect, .node circle, .node polygon")
      .attr("stroke-width", 2)
      .attr("filter", null);
    
    // Apply highlight effect to selected nodes
    if (activeHighlights.size > 0) {
      activeHighlights.forEach(id => {
        svgRef.current.select(`#node-${id} rect, #node-${id} circle, #node-${id} polygon`)
          .attr("stroke-width", 4)
          .attr("filter", "drop-shadow(0 0 8px rgba(66, 153, 225, 0.8))");
      });
    }
  }
  
  return React.createElement("div", {
    ref: containerRef,
    style: {
      width: "100%",
      height: "100%",
      overflow: "hidden"
    }
  });
}

// Expose the component to the global window object with multiple naming conventions
window.erVisualization = ERVisualization;
window.ERVisualization = ERVisualization;
window.er_visualization = ERVisualization;

// Log that the component is loaded
console.log('ER Visualization component loaded and exposed to window object');
