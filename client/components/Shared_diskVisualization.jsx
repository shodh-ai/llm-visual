import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SharedDiskVisualization = ({ data, highlightedElements }) => {
  const containerRef = useRef(null);
  const simulationRef = useRef(null);

  // Effect for initial visualization
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

  // Effect for handling highlights
  useEffect(() => {
    if (!containerRef.current || !highlightedElements) return;

    const svg = d3.select(containerRef.current).select('svg');
    
    // Reset all highlights
    svg.selectAll('.node')
      .style('opacity', 1)
      .selectAll('rect, path, ellipse')
      .style('stroke-width', '2px')
      .style('filter', null);

    svg.selectAll('.connection')
      .style('stroke-width', '2px')
      .style('opacity', 0.6);

    // Apply new highlights
    if (highlightedElements.length > 0) {
      // Dim non-highlighted nodes
      svg.selectAll('.node')
        .style('opacity', 0.3);

      svg.selectAll('.connection')
        .style('opacity', 0.2);

      // Highlight selected nodes
      highlightedElements.forEach(highlight => {
        const node = svg.select(`.node[data-id="${highlight.id}"]`);
        if (!node.empty()) {
          // Highlight the node
          node.style('opacity', 1)
            .raise()
            .selectAll('rect, path, ellipse')
            .style('stroke-width', '4px')
            .style('filter', 'drop-shadow(0 0 4px rgba(74, 222, 128, 0.5))');

          // Highlight connected edges
          svg.selectAll('.connection')
            .filter(function(d) {
              return d.source.id === highlight.id || d.target.id === highlight.id;
            })
            .style('stroke-width', '3px')
            .style('opacity', 0.8)
            .raise();
        }
      });
    }
  }, [highlightedElements]);

  return (
    <div
      id="visualization-container"
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '500px', border: '1px solid #eaeaea' }}
    />
  );
};

const createVisualization = (data, containerElement) => {
  // Get container dimensions
  const container = d3.select(containerElement);
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  
  // Create SVG
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('background-color', '#fff');
  
  // Create main group and center it in the container
  const g = svg.append('g')
    .attr('transform', `translate(${width/2},${height/2})`);
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 2])
    .on('zoom', (event) => g.attr('transform', event.transform));
  
  svg.call(zoom);

  // Add arrowhead markers for bidirectional connections
  const defs = svg.append('defs');
  
  defs.append('marker')
    .attr('id', 'arrowhead-up')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#4a5568');
    
  defs.append('marker')
    .attr('id', 'arrowhead-down')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('orient', 'auto-start-reverse')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#4a5568');

  // Group nodes by type
  const nodesByType = {};
  data.nodes.forEach(node => {
    if (!nodesByType[node.type]) {
      nodesByType[node.type] = [];
    }
    nodesByType[node.type].push(node);
  });

  // Calculate grid layout - ONLY FOR INITIAL POSITIONING
  // Since our group g is already centered, subtract half the container dimensions 
  // from the computed positions to have positions relative to the center.
  // Memory layer (top row)
  const memoryNodes = nodesByType['memory'] || [];
  const memoryCount = memoryNodes.length;
  const memorySpacing = width / (memoryCount + 1);
  
  memoryNodes.forEach((node, index) => {
    node.x = memorySpacing * (index + 1) - width/2;
    node.y = height * 0.15 - height/2;
  });
  
  // CPU layer (second row)
  const cpuNodes = nodesByType['cpu'] || [];
  const cpuCount = cpuNodes.length;
  const cpuSpacing = width / (cpuCount + 1);
  
  cpuNodes.forEach((node, index) => {
    node.x = cpuSpacing * (index + 1) - width/2;
    node.y = height * 0.35 - height/2;
  });
  
  // Network layer (middle row)
  const networkNodes = nodesByType['network'] || [];
  networkNodes.forEach(node => {
    node.x = 0; // center in x since group is centered
    node.y = height * 0.55 - height/2;
    // Only fix the network node's position
    node.fx = 0;
    node.fy = height * 0.55 - height/2;
  });
  
  // Disk layer (bottom row)
  const diskNodes = nodesByType['disk'] || [];
  const diskCount = diskNodes.length;
  const diskSpacing = width / (diskCount + 1);
  
  diskNodes.forEach((node, index) => {
    node.x = diskSpacing * (index + 1) - width/2;
    node.y = height * 0.8 - height/2;
  });

  // Create links before nodes
  const links = g.append('g')
    .attr('class', 'links')
    .selectAll('path')
    .data(data.edges)
    .join('path')
    .attr('class', 'connection')
    .style('fill', 'none')
    .style('stroke', '#4a5568')
    .style('stroke-width', '2px')
    .style('marker-end', 'url(#arrowhead-up)')
    .style('marker-start', 'url(#arrowhead-down)');

  // Create nodes
  const nodes = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(data.nodes)
    .join('g')
    .attr('class', d => `node ${d.type}`)
    .attr('data-id', d => d.id)
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

  // Draw shapes based on node type
  nodes.each(function(d) {
    const node = d3.select(this);
    
    if (d.type === 'memory') {
      // Memory nodes (rectangles)
      node.append('rect')
        .attr('width', 120)
        .attr('height', 50)
        .attr('x', -60)
        .attr('y', -25)
        .attr('rx', 2)
        .style('fill', '#ffffff')
        .style('stroke', '#4ade80')
        .style('stroke-width', '2px');
    } else if (d.type === 'cpu') {
      // CPU nodes (rectangles)
      node.append('rect')
        .attr('width', 120)
        .attr('height', 50)
        .attr('x', -60)
        .attr('y', -25)
        .attr('rx', 2)
        .style('fill', '#ffffff')
        .style('stroke', '#000000')
        .style('stroke-width', '2px');
    } else if (d.type === 'disk') {
      // Disk nodes (cylinders)
      const cylinderHeight = 60;
      const cylinderWidth = 80;
      const ellipseHeight = cylinderHeight * 0.2;
      
      // Cylinder body
      node.append('path')
        .attr('d', `
          M${-cylinderWidth/2},${-cylinderHeight/2 + ellipseHeight}
          v${cylinderHeight - ellipseHeight*2}
          a${cylinderWidth/2},${ellipseHeight} 0 0 0 ${cylinderWidth},0
          v${-cylinderHeight + ellipseHeight*2}
          a${cylinderWidth/2},${ellipseHeight} 0 0 0 ${-cylinderWidth},0
          z
        `)
        .style('fill', '#ffffff')
        .style('stroke', '#4ade80')
        .style('stroke-width', '2px');
        
      // Top ellipse
      node.append('ellipse')
        .attr('cx', 0)
        .attr('cy', -cylinderHeight/2 + ellipseHeight)
        .attr('rx', cylinderWidth/2)
        .attr('ry', ellipseHeight)
        .style('fill', '#ffffff')
        .style('stroke', '#4ade80')
        .style('stroke-width', '2px');
    } else if (d.type === 'network') {
      // Network node (rectangle)
      const networkWidth = width * 0.8;
      node.append('rect')
        .attr('width', networkWidth)
        .attr('height', 50)
        .attr('x', -networkWidth / 2)
        .attr('y', -25)
        .attr('rx', 2)
        .style('fill', '#ffffff')
        .style('stroke', '#4ade80')
        .style('stroke-width', '2px');
    }
    
    // Add text labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', 2)
      .style('fill', d.type === 'cpu' ? '#000000' : '#4ade80')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('font-family', 'sans-serif')
      .text(d.name);
  });

  // Setup simulation with modified forces to maintain the grid-like structure
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges)
      .id(d => d.id)
      .distance(d => {
        if (d.source.type === 'memory' && d.target.type === 'cpu') return 100;
        if (d.source.type === 'cpu' && d.target.type === 'network') return 120;
        if (d.source.type === 'network' && d.target.type === 'disk') return 150;
        return 200;
      })
      .strength(0.1)
    )
    .force('charge', d3.forceManyBody().strength(-100)) 
    .force('collision', d3.forceCollide().radius(80))
    .force('y', d3.forceY().y(d => {
      if (d.type === 'memory') return height * 0.15 - height/2;
      if (d.type === 'cpu') return height * 0.35 - height/2;
      if (d.type === 'network') return height * 0.55 - height/2;
      if (d.type === 'disk') return height * 0.8 - height/2;
      return 0;
    }).strength(0.7))
    .force('x', d3.forceX().x(d => {
      if (d.type === 'network') return 0;
      return d.x;
    }).strength(d => d.type === 'network' ? 1 : 0.3))
    .on('tick', ticked);

  function ticked() {
    links.attr('d', d => {
      const sourceX = d.source.x;
      const sourceY = d.source.y;
      const targetX = d.target.x;
      const targetY = d.target.y;
      
      if (d.type === 'bidirectional') {
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const angle = Math.atan2(dy, dx);
        
        const offset = 5;
        const sourceXOffset = sourceX + offset * Math.sin(angle);
        const sourceYOffset = sourceY - offset * Math.cos(angle);
        const targetXOffset = targetX + offset * Math.sin(angle);
        const targetYOffset = targetY - offset * Math.cos(angle);
        
        return `M${sourceXOffset},${sourceYOffset} L${targetXOffset},${targetYOffset}`;
      } else {
        return `M${sourceX},${sourceY} L${targetX},${targetY}`;
      }
    });
    
    nodes.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    if (d.type !== 'network') {
      d.fx = null;
      d.fy = null;
    }
  }

  simulation.alpha(0.5).restart();
  
  return simulation;
};

export default SharedDiskVisualization;
