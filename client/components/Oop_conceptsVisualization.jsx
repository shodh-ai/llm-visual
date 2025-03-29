import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const OOPConceptsVisualization = ({ data }) => {
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
      style={{ width: '100%', height: '100%', border: '1px solid #eaeaea', minHeight: 500 }}
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
      console.warn(`Node ${node.id} is missing fields array, using placeholder fields`);
      // Add appropriate placeholder fields based on node type
      switch(node.id) {
        case 'class':
          node.fields = ['Fields', 'Methods'];
          break;
        case 'object':
          node.fields = ['State', 'Behavior'];
          break;
        case 'inheritance':
          node.fields = ['Superclass', 'Subclass'];
          break;
        case 'polymorphism':
          node.fields = ['Overloading', 'Overriding'];
          break;
        case 'encapsulation':
          node.fields = ['Data Hiding', 'Data Binding'];
          break;
        case 'abstraction':
          node.fields = ['Hiding Implementation', 'Showing Functionality'];
          break;
        default:
          node.fields = [];
      }
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
    // Ensure abstraction node is wider to fit the longer text
    if (d.id === 'abstraction') return 150;
    // Make inheritance and polymorphism wider
    if (d.id === 'inheritance' || d.id === 'polymorphism') return 130;
    // Make encapsulation wider
    if (d.id === 'encapsulation') return 130;
    // Default width for other nodes
    return 120;
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

  // Assign initial positions
  // Center class node
  const classNode = nodes.find(n => n.id === 'class');
  if (classNode) {
    classNode.x = width / 2;
    classNode.y = height * 0.2;
  }
  
  // Position other nodes around class
  nodes.forEach(node => {
    if (node.id !== 'class') {
      switch(node.id) {
        case 'object':
          node.x = width * 0.15;
          node.y = height * 0.6;
          break;
        case 'inheritance':
          node.x = width * 0.3;
          node.y = height * 0.7;
          break;
        case 'polymorphism':
          node.x = width * 0.5;
          node.y = height * 0.7;
          break; 
        case 'encapsulation':
          node.x = width * 0.7;
          node.y = height * 0.7;
          break;
        case 'abstraction':
          node.x = width * 0.85;
          node.y = height * 0.6;
          break;
        default:
          node.x = width * 0.5;
          node.y = height * 0.5;
      }
    }
    // Calculate and assign dimensions based on content
    node.nodeWidth = calculateNodeWidth(node);
    node.nodeHeight = calculateNodeHeight(node);
  });

  // Draw links first so they appear behind nodes
  let linkElements = g.selectAll('.link')
    .data(links)
    .enter()
    .append('g')
    .attr('class', 'link');
  
  // Draw link lines
  let linkLines = linkElements.append('line')
    .attr('stroke', '#666')
    .attr('stroke-width', 1.5)
    .attr('marker-end', 'url(#arrowhead)');
  
  // Add link labels with colored background based on link type
  let linkLabels = linkElements.append('text')
    .attr('dy', -10) // Position above the line
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', d => {
      // Color mapping based on link type
      if (d.type === 'instantiates') return '#990000';
      if (d.type === 'uses') return '#990000';
      return '#000'; // Default black
    })
    .attr('font-weight', 'bold')
    .text(d => d.label || d.type || '');
  
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
  
  // Draw nodes
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
  
  // Create node elements with visible fields
  nodeGroups.each(function(d) {
    const group = d3.select(this);
    const width = d.nodeWidth;
    const height = d.nodeHeight;
    
    // Create main box with light purple fill
    group.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', '#E6E6FA')
      .attr('stroke', '#9370DB')
      .attr('stroke-width', 1);
    
    // Create title section
    group.append('rect')
      .attr('width', width)
      .attr('height', 28)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', '#E6E6FA')
      .attr('stroke', '#9370DB')
      .attr('stroke-width', 1);
    
    // Add title
    group.append('text')
      .attr('x', width / 2)
      .attr('y', 19) // Adjusted for better vertical centering
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text(d.name);
    
    // Draw line after title
    group.append('line')
      .attr('x1', 0)
      .attr('y1', 28)
      .attr('x2', width)
      .attr('y2', 28)
      .attr('stroke', '#9370DB')
      .attr('stroke-width', 1);
    
    // Add fields with proper styling
    if (d.fields && Array.isArray(d.fields)) {
      d.fields.forEach((field, i) => {
        const fieldColor = '#008800';
        group.append('text')
          .attr('x', 10) // Left margin
          .attr('y', 28 + (i + 1) * 20) // Positioning below title section
          .attr('font-size', '12px')
          .attr('font-family', 'Arial, sans-serif')
          .attr('fill', fieldColor)
          .text(field);
      });
    }
  });
  
  // Set up force simulation with fixed positions
  const simulation = d3.forceSimulation(nodes)
    // Weaker link force to prevent nodes from moving too much
    .force('link', d3.forceLink(links).id(d => d.id).distance(200).strength(0.1))
    // Weaker charge to prevent nodes from repelling too strongly
    .force('charge', d3.forceManyBody().strength(-100))
    // Strong position forces to keep nodes in place
    .force('x', d3.forceX(d => d.x).strength(0.8))
    .force('y', d3.forceY(d => d.y).strength(0.8))
    // Collision detection to prevent overlap
    .force('collision', d3.forceCollide().radius(d => Math.max(d.nodeWidth, d.nodeHeight) / 1.5))
    .alpha(0.1) // Low alpha for minimal movement
    .alphaDecay(0.05) // Quicker decay for faster stabilization
    .on('tick', ticked);
  
  // Force simulation tick function
  function ticked() {
    // Update node positions
    nodeGroups.attr('transform', d => {
      // Ensure nodes stay within bounds
      d.x = Math.max(d.nodeWidth/2, Math.min(width - d.nodeWidth/2, d.x));
      d.y = Math.max(d.nodeHeight/2, Math.min(height - d.nodeHeight/2, d.y));
      
      return `translate(${d.x - d.nodeWidth/2}, ${d.y - d.nodeHeight/2})`;
    });
    
    // Update link positions
    linkLines
      .attr('x1', d => {
        const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
        return source ? source.x : 0;
      })
      .attr('y1', d => {
        const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
        return source ? source.y : 0;
      })
      .attr('x2', d => {
        const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
        if (!target) return 0;
        
        // Calculate end point before the node
        const dx = target.x - (typeof d.source === 'object' ? d.source.x : nodes.find(n => n.id === d.source).x);
        const dy = target.y - (typeof d.source === 'object' ? d.source.y : nodes.find(n => n.id === d.source).y);
        const l = Math.sqrt(dx * dx + dy * dy);
        const nodeRadius = Math.max(target.nodeWidth, target.nodeHeight) / 2;
        
        return target.x - (dx / l) * nodeRadius;
      })
      .attr('y2', d => {
        const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
        if (!target) return 0;
        
        // Calculate end point before the node
        const dx = target.x - (typeof d.source === 'object' ? d.source.x : nodes.find(n => n.id === d.source).x);
        const dy = target.y - (typeof d.source === 'object' ? d.source.y : nodes.find(n => n.id === d.source).y);
        const l = Math.sqrt(dx * dx + dy * dy);
        const nodeRadius = Math.max(target.nodeWidth, target.nodeHeight) / 2;
        
        return target.y - (dy / l) * nodeRadius;
      });
    
    // Update link label positions
    linkLabels
      .attr('x', d => {
        const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
        const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
        return source && target ? (source.x + target.x) / 2 : 0;
      })
      .attr('y', d => {
        const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
        const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
        return source && target ? ((source.y + target.y) / 2) - 10 : 0;
      });
  }
  
  // Drag functions
  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.1).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
  }
  
  return simulation;
};

export default OOPConceptsVisualization;