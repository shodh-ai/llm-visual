import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const DistributedDatabaseVisualization = ({ data }) => {
  const containerRef = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    
    // Clear any previous visualization
    d3.select(containerRef.current).selectAll('*').remove();
    
    // Create visualization
    simulationRef.current = createDistributedDatabaseVisualization(data, containerRef.current);
    
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

const createDistributedDatabaseVisualization = (data, containerElement) => {
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
  
  // Create main group
  const g = svg.append('g');
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 2])
    .on('zoom', (event) => g.attr('transform', event.transform));
  
  svg.call(zoom);

  // Group nodes by type
  const nodesByType = {};
  data.nodes.forEach(node => {
    if (!nodesByType[node.type]) {
      nodesByType[node.type] = [];
    }
    nodesByType[node.type].push(node);
  });

  // Position nodes based on the image layout
  const networkNode = nodesByType['network'][0];
  const serverNodes = nodesByType['server'] || [];
  const diskNodes = nodesByType['disk'] || [];
  
  // Position network node in the center
  const networkX = width / 2;
  const networkY = height / 2;
  networkNode.x = networkX;
  networkNode.y = networkY;
  networkNode.fx = networkX;
  networkNode.fy = networkY;
  
  // Position servers around the network in a cross pattern
  if (serverNodes.length === 4) {
    // Site 1 (top)
    serverNodes[0].x = networkX;
    serverNodes[0].y = networkY - 120;
    
    // Site 2 (right)
    serverNodes[1].x = networkX + 120;
    serverNodes[1].y = networkY;
    
    // Site 3 (bottom)
    serverNodes[2].x = networkX;
    serverNodes[2].y = networkY + 120;
    
    // Site 4 (left)
    serverNodes[3].x = networkX - 120;
    serverNodes[3].y = networkY;
  }
  
  // Position database nodes next to their servers
  if (diskNodes.length === 4) {
    // DB 1 (top right)
    diskNodes[0].x = serverNodes[0].x + 80;
    diskNodes[0].y = serverNodes[0].y;
    
    // DB 2 (bottom right)
    diskNodes[1].x = serverNodes[1].x + 80;
    diskNodes[1].y = serverNodes[1].y;
    
    // DB 3 (not shown in image but placing for completeness)
    diskNodes[2].x = serverNodes[2].x + 80;
    diskNodes[2].y = serverNodes[2].y;
    
    // DB 4 (left)
    diskNodes[3].x = serverNodes[3].x - 80;
    diskNodes[3].y = serverNodes[3].y;
  }

  // Create links before nodes
  const links = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(data.edges)
    .join('line')
    .attr('class', 'connection')
    .style('stroke', '#000000')
    .style('stroke-width', 1.5);

  // Create nodes
  const nodes = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(data.nodes)
    .join('g')
    .attr('class', d => `node ${d.type}`)
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

  // Draw shapes based on node type
  nodes.each(function(d) {
    const node = d3.select(this);
    
    if (d.type === 'server') {
      // Server nodes
      const serverWidth = 50;
      const serverHeight = 80;
      
      // Server body
      node.append('rect')
        .attr('width', serverWidth)
        .attr('height', serverHeight)
        .attr('x', -serverWidth/2)
        .attr('y', -serverHeight/2)
        .attr('fill', '#ffffff')
        .attr('stroke', '#000000')
        .attr('stroke-width', 1.5);
      
      // Server details (lines to represent server components)
      node.append('rect')
        .attr('width', serverWidth * 0.7)
        .attr('height', serverHeight * 0.2)
        .attr('x', -serverWidth * 0.35)
        .attr('y', -serverHeight * 0.3)
        .attr('fill', '#f8cecc')
        .attr('stroke', '#b85450')
        .attr('stroke-width', 1);
        
      // Server rack lines
      for (let i = 0; i < 5; i++) {
        node.append('line')
          .attr('x1', -serverWidth * 0.35)
          .attr('y1', -serverHeight * 0.1 + i * 10)
          .attr('x2', serverWidth * 0.35)
          .attr('y2', -serverHeight * 0.1 + i * 10)
          .attr('stroke', '#000000')
          .attr('stroke-width', 0.5);
      }
      
    } else if (d.type === 'network') {
      // Network node (oval)
      const networkWidth = 120;
      const networkHeight = 60;
      
      node.append('ellipse')
        .attr('rx', networkWidth / 2)
        .attr('ry', networkHeight / 2)
        .attr('fill', '#f8cecc')
        .attr('stroke', '#000000')
        .attr('stroke-width', 1.5);
    } else if (d.type === 'disk') {
      // Database cylinder
      const dbWidth = 60;
      const dbHeight = 60;
      const ellipseHeight = dbHeight * 0.25;
      
      // Database body (cylinder)
      node.append('path')
        .attr('d', `
          M${-dbWidth/2},${-dbHeight/2 + ellipseHeight}
          v${dbHeight - ellipseHeight*2}
          a${dbWidth/2},${ellipseHeight} 0 0 0 ${dbWidth},0
          v${-dbHeight + ellipseHeight*2}
          a${dbWidth/2},${ellipseHeight} 0 0 0 ${-dbWidth},0
          z
        `)
        .attr('fill', '#f8cecc')
        .attr('stroke', '#000000')
        .attr('stroke-width', 1.5);
        
      // Database top ellipse
      node.append('ellipse')
        .attr('cx', 0)
        .attr('cy', -dbHeight/2 + ellipseHeight)
        .attr('rx', dbWidth/2)
        .attr('ry', ellipseHeight)
        .attr('fill', '#f8cecc')
        .attr('stroke', '#000000')
        .attr('stroke-width', 1.5);
    }
    
    // Add text labels below nodes
    if (d.type === 'server' || d.type === 'disk') {
      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', d.type === 'server' ? 55 : 45)
        .attr('font-size', '12px')
        .attr('font-family', 'sans-serif')
        .text(d.name);
    } else if (d.type === 'network') {
      // Text inside network node
      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('font-family', 'sans-serif')
        .text(d.name);
    }
  });

  // Setup simulation with custom forces
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges)
      .id(d => d.id)
      .distance(d => 150)
      .strength(0.1)
    )
    .force('charge', d3.forceManyBody().strength(-100))
    .force('collision', d3.forceCollide().radius(60))
    .force('x', d3.forceX().x(d => d.x).strength(0.8))
    .force('y', d3.forceY().y(d => d.y).strength(0.8))
    .on('tick', ticked);

  // Tick function to update positions
  function ticked() {
    // Update link positions
    links
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    // Update node positions
    nodes.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  // Drag functions
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

  // Initial simulation with higher alpha to settle positions
  simulation.alpha(0.5).restart();
  
  return simulation;
};

export default DistributedDatabaseVisualization;