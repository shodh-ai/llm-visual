import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const StrategicManagementVisualization = ({ data }) => {
  const containerRef = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    
    // Clear any previous visualization
    d3.select(containerRef.current).selectAll('*').remove();
    
    // Create visualization
    simulationRef.current = createVisualization(data, containerRef.current);
    
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [data]);

  return (
    <div 
      id="visualization-container" 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', border: '1px solid #eaeaea' }}
    />
  );
};
      
const createVisualization = (data, containerElement) => {
  // Handle potential data structure issues
  if (!data) {
    throw new Error("No data provided");
  }
  
  // Ensure we have the right data structure
  if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
    throw new Error("Invalid or empty nodes array in data");
  }
  
  // Transform edges to links if needed
  const links = data.links || (data.edges ? [...data.edges] : []);
  const nodes = [...data.nodes]; // Create a copy to prevent mutation issues
  
  if (links.length === 0) {
    console.warn("No links/edges found in data. Visualization may be incomplete.");
  }
  
  // Validate and ensure node structure is complete
  nodes.forEach((node, index) => {
    if (!node.id) {
      throw new Error(`Node at index ${index} is missing an id property`);
    }
    if (!node.name) {
      console.warn(`Node ${node.id} is missing a name property, using id as fallback`);
      node.name = node.id;
    }
    // Initialize fields array if missing
    if (!node.fields || !Array.isArray(node.fields)) {
      node.fields = [];
    }
  });
  
  // Get container dimensions
  const container = d3.select(containerElement);
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  
  // Create SVG
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height]);
  
  // Add gradient definitions for nodes
  const defs = svg.append("defs");
  
  // Add multiple gradients for different node types
  const gradients = [
    { id: "gradient-corporate", color1: "#2E86C1", color2: "#1B4F72" },
    { id: "gradient-business", color1: "#27AE60", color2: "#196F3D" },
    { id: "gradient-functional", color1: "#F39C12", color2: "#9A7D0A" },
    { id: "gradient-planning", color1: "#8E44AD", color2: "#5B2C6F" },
    { id: "gradient-management", color1: "#E74C3C", color2: "#943126" },
    { id: "gradient-tools", color1: "#1ABC9C", color2: "#117864" }
  ];
  
  gradients.forEach(gradient => {
    const linearGradient = defs.append("linearGradient")
      .attr("id", gradient.id)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");
      
    linearGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", gradient.color1);
      
    linearGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", gradient.color2);
  });
  
  // Add a subtle pattern for node backgrounds
  defs.append("pattern")
    .attr("id", "dot-pattern")
    .attr("width", 10)
    .attr("height", 10)
    .attr("patternUnits", "userSpaceOnUse")
    .append("circle")
    .attr("cx", 3)
    .attr("cy", 3)
    .attr("r", 1)
    .attr("fill", "rgba(255, 255, 255, 0.2)");
  
  // Add zoom behavior
  const g = svg.append('g');
  svg.call(d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([0.5, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    }));

  // Define node dimensions
  const calculateNodeWidth = (d) => {
    // Make some nodes wider based on content
    if (d.id === 'tools') return 160;
    if (d.id === 'corporate' || d.id === 'business' || d.id === 'functional') return 140;
    return 130;
  };

  const calculateNodeHeight = (d) => {
    // Base height for title section
    const baseHeight = 30;
    // Each field needs about 20px of height
    const fieldsHeight = d.fields.length * 20;
    // Add some padding at the bottom
    const padding = 10;
    return baseHeight + fieldsHeight + padding;
  };

  // Assign node gradients based on id
  const getNodeFill = (d) => {
    switch(d.id) {
      case 'strategic_management': return "url(#gradient-management)";
      case 'corporate': return "url(#gradient-corporate)";
      case 'business': return "url(#gradient-business)";
      case 'functional': return "url(#gradient-functional)";
      case 'planning': return "url(#gradient-planning)";
      case 'tools': return "url(#gradient-tools)";
      default: return "#E6E6FA"; // Default fallback
    }
  };

  // Assign initial positions in a hexagonal formation
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.3;
  
  // Position strategic management at center
  const mainNode = nodes.find(n => n.id === 'strategic_management');
  if (mainNode) {
    mainNode.x = centerX;
    mainNode.y = centerY;
  }
  
  // Position other nodes in a circle around the center
  const angleStep = (2 * Math.PI) / (nodes.length - 1);
  let currentNode = 0;
  
  nodes.forEach(node => {
    if (node.id !== 'strategic_management') {
      const angle = currentNode * angleStep;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
      currentNode++;
    }
    
    // Calculate and assign dimensions based on content
    node.nodeWidth = calculateNodeWidth(node);
    node.nodeHeight = calculateNodeHeight(node);
  });

  // Create arrow marker for directed graph
  svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#666');
  
  // Draw links first so they appear behind nodes
  let linkElements = g.selectAll('.link')
    .data(links)
    .enter()
    .append('g')
    .attr('class', 'link');
  
  // Draw curved link paths
  let linkPaths = linkElements.append('path')
    .attr('fill', 'none')
    .attr('stroke', '#666')
    .attr('stroke-width', 1.5)
    .attr('marker-end', 'url(#arrowhead)')
    .attr('opacity', 0.7)
    .attr('stroke-dasharray', d => d.type === 'influences' ? '5,5' : 'none');
  
  // Add link labels with colored background
  let linkLabels = linkElements.append('g')
    .attr('class', 'link-label');
  
  // Label background
  linkLabels.append('rect')
    .attr('rx', 10)
    .attr('ry', 10)
    .attr('fill', 'white')
    .attr('stroke', '#666')
    .attr('stroke-width', 0.5)
    .attr('opacity', 0.9)
    .attr('width', d => d.label ? d.label.length * 6 + 10 : 0)
    .attr('height', 16);
  
  // Label text
  linkLabels.append('text')
    .attr('dy', 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', d => {
      if (d.type === 'includes') return '#2E86C1';
      if (d.type === 'influences') return '#E74C3C';
      if (d.type === 'utilizes') return '#27AE60';
      return '#333';
    })
    .attr('font-weight', 'bold')
    .text(d => d.label || d.type || '');
  
  // Draw nodes with animation
  const nodeGroups = g.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x - d.nodeWidth/2}, ${d.y - d.nodeHeight/2})`)
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded));
  
  // Create node elements with visible fields and animations
  nodeGroups.each(function(d, i) {  // Make sure to include the index parameter here
    const group = d3.select(this);
    const width = d.nodeWidth;
    const height = d.nodeHeight;
    
    // Create main box with gradient fill
    const mainRect = group.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', getNodeFill(d))
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0) // Start invisible for animation
      .attr('filter', 'url(#dot-pattern)'); // Apply pattern
    
    // Animate node appearance
    mainRect.transition()
      .duration(1000)
      .delay(i * 150)  // Use the index directly here
      .attr('opacity', 1)
      .attr('stroke-width', 1.5);
    
    // Add a glow effect filter
    const filterId = `glow-${d.id}`;
    defs.append('filter')
      .attr('id', filterId)
      .attr('height', '130%')
      .append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 3)
      .attr('result', 'blur');
    
    // Add the title section with slight transparency
    group.append('rect')
      .attr('width', width)
      .attr('height', 28)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', getNodeFill(d))
      .attr('stroke', '#333')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0) // Start invisible for animation
      .transition()
      .duration(1000)
      .delay(i * 150 + 200)  // Use the index directly
      .attr('opacity', 0.9);
    
    // Add title with animation - ensure this is visible
    const title = group.append('text')
      .attr('x', width / 2)
      .attr('y', 19)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .attr('opacity', 1)  // Set immediate visibility to 1 instead of 0
      .text(d.name);
    
    // Draw line after title with animation
    const titleLine = group.append('line')
      .attr('x1', 0)
      .attr('y1', 28)
      .attr('x2', 0) // Start with 0 width
      .attr('y2', 28)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.7);
    
    // Animate line drawing
    titleLine.transition()
      .duration(1000)
      .delay(i * 150 + 400)  // Use index directly
      .attr('x2', width);
    
    // Add fields with staggered animation - ensure they're visible
    if (d.fields && Array.isArray(d.fields)) {
      d.fields.forEach((field, fieldIndex) => {
        const fieldText = group.append('text')
          .attr('x', 10)
          .attr('y', 28 + (fieldIndex + 1) * 20)
          .attr('font-size', '12px')
          .attr('font-family', 'Arial, sans-serif')
          .attr('fill', 'white')
          .attr('opacity', 1)  // Set immediate visibility to 1 instead of 0
          .text(field);
      });
    }
    
    // Add a subtle pulse animation to the node
    function pulseNode() {
      mainRect
        .transition()
        .duration(2000)
        .attr('filter', `url(#${filterId})`)
        .transition()
        .duration(2000)
        .attr('filter', 'none')
        .on('end', pulseNode);
    }
    
    // Start the pulse animation after initial appearance
    setTimeout(pulseNode, 2000);
  });
  
  // Set up force simulation with forces adjusted for strategic concepts
  const simulation = d3.forceSimulation(nodes)
    // Custom link force for curved links
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(d => d.type === 'includes' ? 180 : 220) // Different distances by link type
      .strength(0.2))
    // Repulsion between nodes
    .force('charge', d3.forceManyBody().strength(-300))
    // Center attraction force
    .force('center', d3.forceCenter(width/2, height/2).strength(0.05))
    // Positioning forces to maintain approximate layout
    .force('x', d3.forceX(d => d.x).strength(0.1))
    .force('y', d3.forceY(d => d.y).strength(0.1))
    // Collision detection to prevent overlap
    .force('collision', d3.forceCollide().radius(d => Math.max(d.nodeWidth, d.nodeHeight) / 1.8))
    .alphaDecay(0.01) // Slower decay for more movement
    .on('tick', ticked);
  
  // Function to calculate curved path for links
  function linkArc(d) {
    const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
    const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
    
    if (!source || !target) return '';
    
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Adjust curve
    
    // Calculate node edge points instead of center
    const sourceNodeRadius = Math.max(source.nodeWidth, source.nodeHeight) / 2;
    const targetNodeRadius = Math.max(target.nodeWidth, target.nodeHeight) / 2;
    
    const angle = Math.atan2(dy, dx);
    const sourceX = source.x + Math.cos(angle) * sourceNodeRadius;
    const sourceY = source.y + Math.sin(angle) * sourceNodeRadius;
    const targetX = target.x - Math.cos(angle) * targetNodeRadius;
    const targetY = target.y - Math.sin(angle) * targetNodeRadius;
    
    return `M${sourceX},${sourceY}A${dr},${dr} 0 0,1 ${targetX},${targetY}`;
  }
  
  // Force simulation tick function
  function ticked() {
    // Update node positions with bounds checking
    nodeGroups.attr('transform', d => {
      // Ensure nodes stay within bounds
      d.x = Math.max(d.nodeWidth/2, Math.min(width - d.nodeWidth/2, d.x));
      d.y = Math.max(d.nodeHeight/2, Math.min(height - d.nodeHeight/2, d.y));
      
      return `translate(${d.x - d.nodeWidth/2}, ${d.y - d.nodeHeight/2})`;
    });
    
    // Update link paths with curved arcs
    linkPaths.attr('d', linkArc);
    
    // Update link label positions
    linkLabels.attr('transform', d => {
      const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
      const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
      
      if (!source || !target) return '';
      
      // Calculate midpoint of the arc
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Position the label at the midpoint of the arc
      const midX = source.x + dx/2 + Math.sin(angle) * 15; // Offset perpendicular to arc
      const midY = source.y + dy/2 - Math.cos(angle) * 15;
      
      // Center the label background
      const labelWidth = d.label ? d.label.length * 6 + 10 : 0;
      return `translate(${midX - labelWidth/2}, ${midY - 8})`;
    });
  }
  
  // Drag functions
  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.1).restart();
    d.fx = d.x;
    d.fy = d.y;
    
    // Highlight this node and connected nodes/links on drag start
    highlightConnections(d);
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    
    // Optional: keep nodes fixed after drag or let them float
    d.fx = null;
    d.fy = null;
    
    // Reset highlights
    resetHighlights();
  }
  
  // Function to highlight connections when a node is dragged
  function highlightConnections(node) {
    // Dim all nodes first
    nodeGroups.selectAll('rect')
      .transition()
      .duration(300)
      .attr('opacity', 0.3);
    
    // Dim all links
    linkPaths
      .transition()
      .duration(300)
      .attr('opacity', 0.2);
    
    // Dim all link labels
    linkLabels
      .transition()
      .duration(300)
      .attr('opacity', 0.2);
    
    // Highlight the selected node
    nodeGroups.filter(d => d.id === node.id)
      .selectAll('rect')
      .transition()
      .duration(300)
      .attr('opacity', 1)
      .attr('stroke-width', 2);
    
    // Find connected nodes and links
    const connectedLinks = links.filter(l => 
      (typeof l.source === 'object' ? l.source.id : l.source) === node.id || 
      (typeof l.target === 'object' ? l.target.id : l.target) === node.id
    );
    
    const connectedNodeIds = new Set();
    connectedLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    });
    
    // Highlight connected nodes
    nodeGroups.filter(d => connectedNodeIds.has(d.id))
      .selectAll('rect')
      .transition()
      .duration(300)
      .attr('opacity', 1);
    
    // Highlight connected links
    linkPaths.filter(d => 
      (typeof d.source === 'object' ? d.source.id : d.source) === node.id || 
      (typeof d.target === 'object' ? d.target.id : d.target) === node.id
    )
      .transition()
      .duration(300)
      .attr('opacity', 1)
      .attr('stroke-width', 2);
    
    // Highlight connected link labels
    linkLabels.filter(d => 
      (typeof d.source === 'object' ? d.source.id : d.source) === node.id || 
      (typeof d.target === 'object' ? d.target.id : d.target) === node.id
    )
      .transition()
      .duration(300)
      .attr('opacity', 1);
  }
  
  // Function to reset highlights
  function resetHighlights() {
    // Reset all nodes
    nodeGroups.selectAll('rect')
      .transition()
      .duration(300)
      .attr('opacity', 1)
      .attr('stroke-width', 1.5);
    
    // Reset all links
    linkPaths
      .transition()
      .duration(300)
      .attr('opacity', 0.7)
      .attr('stroke-width', 1.5);
    
    // Reset all link labels
    linkLabels
      .transition()
      .duration(300)
      .attr('opacity', 0.9);
  }
  
  // Add hover interactions
  nodeGroups
    .on('mouseover', function(event, d) {
      // Highlight connections on hover
      highlightConnections(d);
      
      // Enlarge the node slightly
      d3.select(this)
        .transition()
        .duration(300)
        .attr('transform', `translate(${d.x - d.nodeWidth/2}, ${d.y - d.nodeHeight/2}) scale(1.05)`);
    })
    .on('mouseout', function(event, d) {
      // Reset highlights
      resetHighlights();
      
      // Return node to normal size
      d3.select(this)
        .transition()
        .duration(300)
        .attr('transform', `translate(${d.x - d.nodeWidth/2}, ${d.y - d.nodeHeight/2}) scale(1)`);
    });
  
  return simulation;
};

export default StrategicManagementVisualization;