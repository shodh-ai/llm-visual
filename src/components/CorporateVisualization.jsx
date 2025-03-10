import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const CorporateStrategyVisualization = ({ data }) => {
  const containerRef = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    
    // Clear any previous visualization
    d3.select(containerRef.current).selectAll('*').remove();
    
    // Create visualization
    simulationRef.current = createCorporateStrategyVisualization(data, containerRef.current);
    
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
      style={{ width: '100%', height: '600px', border: '1px solid #eaeaea' }}
    />
  );
};

const createCorporateStrategyVisualization = (data, containerElement) => {
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
  
  // Add title at the top
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '20px')
    .attr('font-weight', 'bold')
    .attr('font-family', 'sans-serif')
    .attr('fill', '#2a4056')
    .text('Growth Strategies');
  
  // Create main group with margin from the top for the title
  const g = svg.append('g')
    .attr('transform', `translate(0, 20)`);

  // Add zoom behavior with a filter to avoid dragging on whitespace.
  // Only allow zoom (drag or wheel) if the event originates from a node element.
  const zoom = d3.zoom()
    .filter(function(event) {
      if (event.type === 'wheel') return true;
      return event.target.closest('.node') !== null;
    })
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

  // --- Diversification target fix ---
  // Find the Diversification node among strategy_type nodes
  const diversificationNode = (nodesByType['strategy_type'] || []).find(
    (n) => n.name === 'Diversification'
  );
  if (diversificationNode) {
    // Check if a target for Diversification already exists.
    const diversificationTargetExists = (data.nodes || []).some(
      (node) => node.type === 'target' && node.name === 'Target for Diversification'
    );
    if (!diversificationTargetExists) {
      // Create and add a new target node only if it doesn't exist already.
      const newTargetNode = {
        id: 'diversification_target',  // Unique ID
        type: 'target',                // Bullseye drawing
        name: 'Target for Diversification'
      };
      data.nodes.push(newTargetNode);
      data.edges.push({
        source: diversificationNode.id,
        target: newTargetNode.id,
        type: 'strategy_goal'  // or whatever edge type you want
      });
      // Set an initial position (60px left of Diversification)
      newTargetNode.x = diversificationNode.x - 60;
      newTargetNode.y = diversificationNode.y;
      
      // Also update the nodesByType grouping for target nodes.
      if (nodesByType['target']) {
        nodesByType['target'].push(newTargetNode);
      } else {
        nodesByType['target'] = [newTargetNode];
      }
    }
  }
  // --- End diversification target fix ---

  // Position nodes in a radial layout
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.3;
  
  // Position the central "Growth" node
  const growthNode = nodesByType['strategy'][0];
  growthNode.x = centerX;
  growthNode.y = centerY;
  growthNode.fx = centerX;
  growthNode.fy = centerY;
  
  // Position strategy_type nodes in a circle around the growth node
  const strategyNodes = nodesByType['strategy_type'] || [];
  const strategyCount = strategyNodes.length;
  strategyNodes.forEach((node, i) => {
    const angle = (i * 2 * Math.PI / strategyCount) - Math.PI / 2;
    node.x = centerX + radius * Math.cos(angle);
    node.y = centerY + radius * Math.sin(angle);
  });
  
  // Position target nodes beyond the strategy nodes.
  // For a Diversification node, place its target 60px to the left.
  const targetNodes = nodesByType['target'] || [];
  targetNodes.forEach((node, i) => {
    if (i < strategyCount) {
      const strategyNode = strategyNodes[i];
      if (strategyNode.name && strategyNode.name.toLowerCase() === 'diversification') {
        node.x = strategyNode.x - 60;
        node.y = strategyNode.y;
      } else {
        const dx = strategyNode.x - centerX;
        const dy = strategyNode.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        node.x = strategyNode.x + normalizedDx * 60;
        node.y = strategyNode.y + normalizedDy * 60;
      }
    }
  });

  // Create links before nodes
  const links = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(data.edges)
    .join('line')
    .attr('class', d => `connection ${d.type}`)
    .style('stroke', '#f8cecc')
    .style('stroke-width', 2);

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
    
    if (d.type === 'strategy') {
      // Central strategy node (rectangle with rounded corners)
      const nodeWidth = 80;
      const nodeHeight = 40;
      node.append('rect')
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('x', -nodeWidth/2)
        .attr('y', -nodeHeight/2)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', '#f8cecc')
        .attr('stroke', '#b85450')
        .attr('stroke-width', 2);
      // Add silhouette of business person below the growth node
      node.append('path')
        .attr('d', `
          M0,${nodeHeight/2 + 10}
          l-20,30 l5,0 l-5,20 l10,-5 l2,15 l8,0 l2,-15 l10,5 l-5,-20 l5,0 z
        `)
        .attr('fill', '#f8cecc')
        .attr('opacity', 0.7)
        .attr('stroke', '#b85450')
        .attr('stroke-width', 1);
        
    } else if (d.type === 'strategy_type') {
      // Strategy type nodes (circles with icons)
      const nodeRadius = 30;
      node.append('circle')
        .attr('r', nodeRadius)
        .attr('fill', '#ffffff')
        .attr('stroke', '#b85450')
        .attr('stroke-width', 2);
      switch(d.properties.icon) {
        case 'handshake':
          node.append('path')
            .attr('d', 'M-15,5 L-5,-5 L0,0 L5,-5 L15,5 L5,10 L0,5 L-5,10 Z')
            .attr('fill', '#f8cecc')
            .attr('stroke', '#b85450')
            .attr('stroke-width', 1);
          break;
        case 'person':
          node.append('circle')
            .attr('cx', 0)
            .attr('cy', -8)
            .attr('r', 7)
            .attr('fill', '#f8cecc');
          node.append('path')
            .attr('d', 'M0,0 L-8,15 L8,15 Z')
            .attr('fill', '#f8cecc');
          break;
        case 'globe':
          node.append('circle')
            .attr('r', 12)
            .attr('fill', 'none')
            .attr('stroke', '#f8cecc')
            .attr('stroke-width', 2);
          node.append('path')
            .attr('d', 'M-12,0 L12,0 M0,-12 L0,12')
            .attr('fill', 'none')
            .attr('stroke', '#f8cecc')
            .attr('stroke-width', 2);
          break;
        case 'lightbulb':
          node.append('path')
            .attr('d', 'M0,-10 C-8,-10 -8,5 0,5 C8,5 8,-10 0,-10 M-3,5 L-3,10 L3,10 L3,5')
            .attr('fill', '#f8cecc')
            .attr('stroke', '#b85450')
            .attr('stroke-width', 1);
          break;
        case 'puzzle':
          node.append('path')
            .attr('d', 'M-10,-10 L10,-10 L10,10 L-10,10 Z')
            .attr('fill', '#f8cecc')
            .attr('stroke', '#b85450')
            .attr('stroke-width', 1);
          node.append('path')
            .attr('d', 'M0,-10 C0,-15 -5,-15 -5,-10 M10,0 C15,0 15,-5 10,-5 M0,10 C0,15 5,15 5,10 M-10,0 C-15,0 -15,5 -10,5')
            .attr('fill', '#f8cecc')
            .attr('stroke', '#b85450')
            .attr('stroke-width', 1);
          break;
        default:
          node.append('circle')
            .attr('r', 5)
            .attr('fill', '#f8cecc');
      }
      
    } else if (d.type === 'target') {
      // Target nodes (bullseye)
      const targetRadius = 20;
      node.append('circle')
        .attr('r', targetRadius)
        .attr('fill', '#ffffff')
        .attr('stroke', '#b85450')
        .attr('stroke-width', 1);
      node.append('circle')
        .attr('r', targetRadius * 0.7)
        .attr('fill', '#ffffff')
        .attr('stroke', '#b85450')
        .attr('stroke-width', 1);
      node.append('circle')
        .attr('r', targetRadius * 0.4)
        .attr('fill', '#f8cecc')
        .attr('stroke', '#b85450')
        .attr('stroke-width', 1);
      node.append('circle')
        .attr('r', targetRadius * 0.15)
        .attr('fill', '#b85450');
    }
    
    // Add text labels
    if (d.type === 'strategy' || d.type === 'strategy_type') {
      const isStrategy = d.type === 'strategy';
      const yOffset = isStrategy ? 0 : 45;
      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', yOffset)
        .attr('font-size', isStrategy ? '14px' : '12px')
        .attr('font-weight', isStrategy ? 'bold' : 'normal')
        .attr('font-family', 'sans-serif')
        .attr('fill', '#2a4056')
        .text(d.name);
    }
  });

  // Setup simulation with custom forces
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges)
      .id(d => d.id)
      .distance(d => d.type === 'strategy_goal' ? 60 : 120)
      .strength(d => d.type === 'strategy_goal' ? 0.2 : 0.5)
    )
    .force('charge', d3.forceManyBody().strength(-200))
    .force('collision', d3.forceCollide().radius(60))
    .force('x', d3.forceX().x(d => d.x).strength(0.8))
    .force('y', d3.forceY().y(d => d.y).strength(0.8))
    .on('tick', ticked);

  function ticked() {
    links
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
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
    if (d.type !== 'strategy') {
      d.fx = null;
      d.fy = null;
    }
  }

  simulation.alpha(0.5).restart();
  return simulation;
};

export default CorporateStrategyVisualization;
