import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SharedNothingVisualization = ({ data, highlightedElements }) => {
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

  // Effect for handling highlights
  useEffect(() => {
    if (!containerRef.current || !highlightedElements) return;

    const svg = d3.select(containerRef.current).select('svg');
    
    // Reset all highlights
    svg.selectAll('.node')
      .style('opacity', 1)
      .selectAll('rect, path, ellipse')
      .style('stroke-width', '1.5px')
      .style('filter', null);

    svg.selectAll('.connection')
      .style('stroke-width', '1.5px')
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
            .style('stroke-width', '3px')
            .style('filter', 'drop-shadow(0 0 4px rgba(74, 222, 128, 0.5))');

          // Highlight connected edges
          svg.selectAll('.connection')
            .filter(function(d) {
              return d.source.id === highlight.id || d.target.id === highlight.id;
            })
            .style('stroke-width', '2px')
            .style('opacity', 0.8)
            .raise();
        }
      });
    }
  }, [highlightedElements]);

  return React.createElement(
    "div",
    {
      id: "visualization-container",
      ref: containerRef,
      style: { width: '100%', height: '100%', border: '1px solid #eaeaea', minHeight: '500px' }
    }
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

  // Calculate the number of clusters we need
  const cpuNodes = nodesByType['cpu'] || [];
  const clusterCount = cpuNodes.length;
  
  // Create clusters array to organize nodes
  const clusters = Array.from({ length: clusterCount }, (_, i) => ({
    id: i,
    cpu: null,
    memory: null,
    disk: null,
    x: 0,
    y: 0
  }));

  // Assign nodes to clusters
  const memoryNodes = nodesByType['memory'] || [];
  const diskNodes = nodesByType['disk'] || [];
  
  // Assign CPUs to clusters
  cpuNodes.forEach((node, i) => {
    if (i < clusters.length) {
      clusters[i].cpu = node;
    }
  });
  
  // Assign memories to clusters
  memoryNodes.forEach((node, i) => {
    if (i < clusters.length) {
      clusters[i].memory = node;
    }
  });
  
  // Assign disks to clusters
  diskNodes.forEach((node, i) => {
    if (i < clusters.length) {
      clusters[i].disk = node;
    }
  });

  // Network node for later reference
  const networkNode = (nodesByType['network'] || [])[0];

  // Position clusters around the network
  const networkY = height / 2;
  const networkX = width / 2;
  
  if (clusterCount === 3) {
    
    // Top left cluster
    clusters[0].x = width * 0.25;
    clusters[0].y = height * 0.25;
    
    // Top right cluster
    clusters[1].x = width * 0.7;
    clusters[1].y = height * 0.25;
    
    // Bottom cluster
    clusters[2].x = width * 0.5;
    clusters[2].y = height * 0.77;
  } 
  else {
    // Generic layout for any number of clusters
    const radius = Math.min(width, height) * 0.35;
    clusters.forEach((cluster, i) => {
      const angle = (i * 2 * Math.PI / clusterCount) - Math.PI/2;
      cluster.x = networkX + radius * Math.cos(angle);
      cluster.y = networkY + radius * Math.sin(angle);
    });
  }

  // Now position the individual nodes within each cluster
  clusters.forEach(cluster => {
    if (cluster.cpu) {
      cluster.cpu.x = cluster.x;
      cluster.cpu.y = cluster.y;
    }
    
    if (cluster.memory) {
      cluster.memory.x = cluster.x;
      cluster.memory.y = cluster.y - 70; // Memory above CPU
    }
    
    if (cluster.disk) {
      cluster.disk.x = cluster.x + 120; // Disk to the right of CPU
      cluster.disk.y = cluster.y;
    }
  });
  
  // Position network node
  if (networkNode) {
    networkNode.x = networkX;
    networkNode.y = networkY;
    // Fix network node position
    networkNode.fx = networkX;
    networkNode.fy = networkY;
  }

  // Create links before nodes
  const links = g.append('g')
    .attr('class', 'links')
    .selectAll('path')
    .data(data.edges)
    .join('path')
    .attr('class', 'connection')
    .style('fill', 'none')
    .style('stroke', '#4a5568')
    .style('stroke-width', 1.5);

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
        .attr('width', 100)
        .attr('height', 40)
        .attr('x', -50)
        .attr('y', -20)
        .attr('rx', 2)
        .style('fill', '#ffffff')
        .style('stroke', '#4ade80')
        .style('stroke-width', '1.5px');
    } else if (d.type === 'cpu') {
      // CPU nodes (rectangles)
      node.append('rect')
        .attr('width', 70)
        .attr('height', 40)
        .attr('x', -35)
        .attr('y', -20)
        .attr('rx', 2)
        .style('fill', '#ffffff')
        .style('stroke', '#000000')
        .style('stroke-width', '1.5px');
    } else if (d.type === 'disk') {
      // Disk nodes (cylinders)
      const cylinderHeight = 60;
      const cylinderWidth = 60;
      const ellipseHeight = cylinderHeight * 0.25;
      
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
        .style('stroke-width', '1.5px');
        
      // Top ellipse
      node.append('ellipse')
        .attr('cx', 0)
        .attr('cy', -cylinderHeight/2 + ellipseHeight)
        .attr('rx', cylinderWidth/2)
        .attr('ry', ellipseHeight)
        .style('fill', '#ffffff')
        .style('stroke', '#4ade80')
        .style('stroke-width', '1.5px');
    } else if (d.type === 'network') {
      // Network node (rectangle)
      const networkWidth = width * 0.6;
      node.append('rect')
        .attr('width', networkWidth)
        .attr('height', 40)
        .attr('x', -networkWidth / 2)
        .attr('y', -20)
        .attr('rx', 2)
        .style('fill', '#ffffff')
        .style('stroke', '#4ade80')
        .style('stroke-width', '1.5px');
    }
    
    let fontSize = 10;
    let labelText = d.type === 'memory' ? 'PRIVATE MEMORY' : d.type.toUpperCase();
    
    if (d.type === 'network') {
      fontSize = 14;
      
    }
    

    if (d.type === 'cpu' && labelText.length > 5) {
      fontSize = 10;
    }
    
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', 2)
      .style('fill', d.type === 'cpu' ? '#000000' : '#4ade80')
      .style('font-size', `${fontSize}px`)
      .style('font-weight', 'bold')
      .style('font-family', 'sans-serif')
      .text(labelText);
  });

  // Draw simple straight lines for connections
  function drawConnection(source, target) {
    return `M${source.x},${source.y} L${target.x},${target.y}`;
  }

  // Setup simulation with custom forces to maintain the layout
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges)
      .id(d => d.id)
      .distance(d => {
        if (d.source.type === 'memory' && d.target.type === 'cpu') return 100;
        if (d.source.type === 'cpu' && d.target.type === 'disk') return 120;
        if (d.source.type === 'cpu' && d.target.type === 'network') return 80;
        return 200;
      })
      .strength(0.1)
    )
    .force('charge', d3.forceManyBody().strength(-100))
    .force('collision', d3.forceCollide().radius(60))
    .force('x', d3.forceX().x(d => {
      // Strong x positioning
      return d.x;
    }).strength(0.8))
    .force('y', d3.forceY().y(d => {
      // Strong y positioning
      return d.y;
    }).strength(0.8))
    .on('tick', ticked);

  // Tick function to update positions
  function ticked() {
    // Update link positions with simple lines
    links.attr('d', d => drawConnection(d.source, d.target));
    
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
    // Only keep network node fixed
    if (d.type !== 'network') {
      d.fx = null;
      d.fy = null;
    }
  }

  // Initial simulation with higher alpha to settle positions
  simulation.alpha(0.5).restart();
  
  return simulation;
};

export default SharedNothingVisualization;