import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SharedMemoryVisualization = ({ data, highlightedElements }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  // Effect for creating the base visualization
  useEffect(() => {
    if (!containerRef.current || !data?.nodes) return;
    
    // Clear any previous visualization
    d3.select(containerRef.current).selectAll('*').remove();
    
    // Create base visualization
    createVisualization(data, containerRef.current, svgRef, simulationRef);

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [data]);

  // Effect for handling highlights
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    console.log('Shared_memoryVisualization: Applying highlights:', highlightedElements);

    // Reset all highlights first
    svg.selectAll('.node')
      .transition()
      .duration(300)
      .style('filter', null)
      .select('rect')
      .style('stroke', '#2d3748')
      .style('stroke-width', '2px');

    svg.selectAll('.connection')
      .transition()
      .duration(300)
      .style('stroke', '#4a5568')
      .style('stroke-width', '2px')
      .style('stroke-opacity', 0.6);

    // Apply new highlights if any
    if (highlightedElements && highlightedElements.length > 0) {
      highlightedElements.forEach(element => {
        console.log('Shared_memoryVisualization: Highlighting element:', typeof element === 'object' ? element.id : element);
        
        // Get the element ID
        const elementId = typeof element === 'object' ? element.id : element;
        
        // Try to find the node by ID
        let node = svg.select(`.node[data-node-id="${elementId}"]`);
        
        // If not found, try to find by name (for backwards compatibility)
        if (node.empty()) {
          const nodeName = elementId.toUpperCase();
          node = svg.selectAll('.node').filter(function(d) {
            return d.name === nodeName || d.type === elementId;
          });
        }

        if (!node.empty()) {
          console.log(`Shared_memoryVisualization: Found node for ID: ${elementId}`);
          node.raise(); // Bring highlighted nodes to front
          node.transition()
            .duration(300)
            .select('rect')
            .style('stroke', '#f56565')
            .style('stroke-width', '3px')
            .style('filter', 'drop-shadow(0 0 5px rgba(245, 101, 101, 0.5))');

          // Highlight connected edges with updated styling
          const connectedEdges = svg.selectAll('.connection')
            .filter(function() {
              const path = d3.select(this);
              const sourceId = path.attr('data-source');
              const targetId = path.attr('data-target');
              const nodeId = node.attr('data-node-id');
              return sourceId === nodeId || targetId === nodeId;
            });
            
          console.log(`Shared_memoryVisualization: Found ${connectedEdges.size()} connected edges`);
          
          connectedEdges.transition()
            .duration(300)
            .style('stroke', '#f56565')
            .style('stroke-width', '3px')
            .style('stroke-opacity', 0.8);
        } else {
          console.log(`Shared_memoryVisualization: No node found for ID: ${elementId}`);
        }
      });
    } else {
      console.log('Shared_memoryVisualization: No highlights to apply');
    }
  }, [highlightedElements]);

  return React.createElement(
    "div",
    {
      ref: containerRef,
      style: { 
        width: '100%', 
        height: '500px',
        border: '1px solid #eaeaea',
        position: 'relative',
        overflow: 'hidden'
      }
    }
  );
};

const createVisualization = (data, containerElement, svgRef, simulationRef) => {
  // Get container dimensions
  const container = d3.select(containerElement);
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  
  // Create SVG with responsive sizing
  const svg = container.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .style('background-color', '#fff');
  
  // Store SVG reference
  svgRef.current = svg.node();
  
  // Create main group for zoom/pan behavior
  const g = svg.append('g');

  // Create groups for links and nodes
  const linksGroup = g.append('g').attr('class', 'links');
  const nodesGroup = g.append('g').attr('class', 'nodes');

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 2])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);
  svg.call(zoom.transform, d3.zoomIdentity);

  // Initialize node positions based on their type
  data.nodes.forEach(node => {
    switch (node.type) {
      case 'cpu':
        const cpuIndex = data.nodes.filter(n => n.type === 'cpu').indexOf(node);
        const cpuCount = data.nodes.filter(n => n.type === 'cpu').length;
        const cpuSpacing = width / (cpuCount + 1);
        node.x = cpuSpacing * (cpuIndex + 1);
        node.y = height * 0.2;
        break;
      case 'network':
        node.x = width / 2;
        node.y = height * 0.4;
        break;
      case 'memory':
        node.x = width / 2;
        node.y = height * 0.6;
        break;
      case 'disk':
        const diskIndex = data.nodes.filter(n => n.type === 'disk').indexOf(node);
        const diskCount = data.nodes.filter(n => n.type === 'disk').length;
        const diskSpacing = width / (diskCount + 1);
        node.x = diskSpacing * (diskIndex + 1);
        node.y = height * 0.8;
        break;
    }
    // Add fixed property for drag behavior
    node.fx = node.x;
    node.fy = node.y;
  });

  // Create force simulation
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges)
      .id(d => d.id)
      .distance(100)
      .strength(0.5))
    .force('charge', d3.forceManyBody().strength(-1000))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(60))
    .alphaTarget(0);

  simulationRef.current = simulation;

  // Create links with updated styling (no arrows)
  const links = linksGroup.selectAll('path')
    .data(data.edges)
    .join('path')
    .attr('class', 'connection')
    .attr('data-source', d => d.source.id || d.source)
    .attr('data-target', d => d.target.id || d.target)
    .style('fill', 'none')
    .style('stroke', '#4a5568')
    .style('stroke-width', '2px')
    .style('stroke-opacity', 0.6)
    .style('transition', 'all 0.3s ease')
    .style('cursor', 'pointer')
    .on('mouseover', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .style('stroke-opacity', 1)
        .style('stroke-width', '3px');
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .style('stroke-opacity', 0.6)
        .style('stroke-width', '2px');
    });

  // Create nodes with proper IDs
  const nodes = nodesGroup.selectAll('g')
    .data(data.nodes)
    .join('g')
    .attr('class', d => `node ${d.type}`)
    .attr('data-node-id', d => d.id)
    .style('cursor', 'grab')
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded));

  // Draw shapes based on node type
  nodes.each(function(d) {
    const node = d3.select(this);
    
    // Add rectangle with type-specific styling
    node.append('rect')
      .attr('x', -50)
      .attr('y', -25)
      .attr('width', 100)
      .attr('height', 50)
      .attr('rx', 5)
      .attr('fill', () => {
        switch (d.type) {
          case 'cpu': return '#4299e1';
          case 'network': return '#48bb78';
          case 'memory': return '#ed8936';
          case 'disk': return '#9f7aea';
          default: return '#718096';
        }
      })
      .attr('stroke', '#2d3748')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9)
      .style('transition', 'all 0.3s ease');
    
    // Add text
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .style('font-size', '12px')
      .text(d.name || d.type.toUpperCase());

    // Add hover effects
    node
      .on('mouseover', function() {
        d3.select(this).select('rect')
          .transition()
          .duration(200)
          .style('filter', 'drop-shadow(0 0 5px rgba(66, 153, 225, 0.5))')
          .attr('opacity', 1);
      })
      .on('mouseout', function() {
        if (!d3.select(this).classed('highlighted')) {
          d3.select(this).select('rect')
            .transition()
            .duration(200)
            .style('filter', null)
            .attr('opacity', 0.9);
        }
      });
  });

  // Update force simulation on tick
  simulation.on('tick', () => {
    // Update link positions with smoother curves
    links.attr('d', d => {
      const sourceX = d.source.x;
      const sourceY = d.source.y;
      const targetX = d.target.x;
      const targetY = d.target.y;
      
      // Calculate control points for a smoother curve
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Increased curve factor for smoother bends
      
      return `M${sourceX},${sourceY}A${dr},${dr} 0 0,1 ${targetX},${targetY}`;
    });

    // Update node positions
    nodes.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // Drag functions
  function dragStarted(event, d) {
    d3.select(this).style('cursor', 'grabbing');
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    d3.select(this).style('cursor', 'grab');
    if (!event.active) simulation.alphaTarget(0);
    // Keep the node fixed at its new position
    d.fx = d.x;
    d.fy = d.y;
  }
};

export default SharedMemoryVisualization;