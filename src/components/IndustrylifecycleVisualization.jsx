import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const IndustryLifeCycleVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0 || !containerRef.current) {
      console.error("Invalid data for Industry Life Cycle visualization");
      return;
    }

    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    container.selectAll("*").remove();

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);

    // Define industry skyline SVG
    const defs = svg.append("defs");
    
    // Create an SVG pattern for the industry skyline
    const skylinePattern = defs.append("pattern")
      .attr("id", "skyline-pattern")
      .attr("width", 1)
      .attr("height", 1)
      .attr("patternUnits", "objectBoundingBox");
    
    // Create an SVG group for the detailed city skyline
    const skyline = skylinePattern.append("g")
      .attr("transform", "scale(0.85)");
    
    // Background for pattern
    skyline.append("rect")
      .attr("width", 140)
      .attr("height", 140)
      .attr("fill", "none");
    
    // Main tall building in center
    skyline.append("rect")
      .attr("x", 60)
      .attr("y", 20)
      .attr("width", 20)
      .attr("height", 90)
      .attr("fill", "#333");
    
    // Building windows
    for (let y = 25; y < 115; y += 8) {
      skyline.append("rect")
        .attr("x", 64)
        .attr("y", y)
        .attr("width", 5)
        .attr("height", 6)
        .attr("fill", "#888");
      
      skyline.append("rect")
        .attr("x", 71)
        .attr("y", y)
        .attr("width", 5)
        .attr("height", 6)
        .attr("fill", "#888");
    }
    
    // Building antenna
    skyline.append("rect")
      .attr("x", 67)
      .attr("y", 0)
      .attr("width", 6)
      .attr("height", 20)
      .attr("fill", "#555");
    
    // Factory chimneys
    skyline.append("rect")
      .attr("x", 38)
      .attr("y", 15)
      .attr("width", 8)
      .attr("height", 70)
      .attr("fill", "#444");
    
    skyline.append("rect")
      .attr("x", 48)
      .attr("y", 20)
      .attr("width", 8)
      .attr("height", 65)
      .attr("fill", "#444");
    
    skyline.append("rect")
      .attr("x", 83)
      .attr("y", 25)
      .attr("width", 8)
      .attr("height", 60)
      .attr("fill", "#444");
    
    // Smaller buildings
    skyline.append("rect")
      .attr("x", 15)
      .attr("y", 50)
      .attr("width", 18)
      .attr("height", 60)
      .attr("fill", "#555");
    
    skyline.append("rect")
      .attr("x", 95)
      .attr("y", 40)
      .attr("width", 20)
      .attr("height", 70)
      .attr("fill", "#555");
    
    // More buildings for skyline
    skyline.append("rect")
      .attr("x", 118)
      .attr("y", 55)
      .attr("width", 14)
      .attr("height", 55)
      .attr("fill", "#444");
    
    skyline.append("rect")
      .attr("x", 0)
      .attr("y", 65)
      .attr("width", 12)
      .attr("height", 45)
      .attr("fill", "#444");
      
    // Base ground/foundation 
    skyline.append("path")
      .attr("d", "M0,110 C20,105 50,112 70,108 C90,104 120,110 140,108 L140,120 L0,120 Z")
      .attr("fill", "#777");

    // Define arrow markers 
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-4 -4 8 8")
      .attr("refX", 4)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .append("path")
      .attr("d", "M-4,-4L4,0L-4,4")
      .attr("fill", "#4d8c74");

    // Create a map of node IDs to node objects for easy lookup
    const nodeMap = {};
    data.nodes.forEach(node => {
      nodeMap[node.id] = node;
      
      if (node.id === "industry") {
        node.x = width / 2;
        node.y = height / 2;
      } else if (node.id === "introduction") {
        node.x = width / 2 + 250;
        node.y = height / 2;
      } else if (node.id === "growth") {
        node.x = width / 2;
        node.y = height / 2 + 250;
      } else if (node.id === "maturity") {
        node.x = width / 2 - 250;
        node.y = height / 2;
      } else if (node.id === "decline") {
        node.x = width / 2;
        node.y = height / 2 - 250;
      }
    });

    // Process the edge data to ensure correct source and target references
    const links = data.edges.map(edge => {
      return {
        source: nodeMap[edge.source],
        target: nodeMap[edge.target],
        type: edge.type,
        description: edge.description
      };
    });

    // Fixed positions simulation for the layout we want
    const simulation = d3.forceSimulation(data.nodes)
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX().x(d => d.x).strength(0.2))
      .force("y", d3.forceY().y(d => d.y).strength(0.2))
      .alpha(0.1) // Low alpha for minimal movement
      .alphaDecay(0.01);

    // Draw arrows first so they appear behind nodes
    const arrows = svg.append("g")
      .attr("class", "arrows")
      .selectAll("path")
      .data(links)  // Use our processed links instead of raw edges
      .enter()
      .append("path")
      .attr("stroke", "#4d8c74")
      .attr("stroke-width", 5)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrowhead)");

    // Node groups
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add industry skyline for the center
    node.filter(d => d.id === "industry")
      .append("circle")
      .attr("r", 60)
      .attr("fill", "url(#skyline-pattern)");

    // Add industry label
    node.filter(d => d.id === "industry")
      .append("text")
      .attr("dy", 70)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(d => d.name);

    // Add stage nodes as green circles
    node.filter(d => d.id !== "industry")
      .append("circle")
      .attr("r", 70)
      .attr("fill", "#4d8c74");

    // Add stage labels
    node.filter(d => d.id !== "industry")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .style("fill", "white")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .text(d => d.name);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      // Update node positions
      node.attr("transform", d => `translate(${d.x},${d.y})`);
      
      // Update arrow paths
      arrows.attr("d", function(d) {
        // Source and target should be objects with x and y properties
        if (!d.source || !d.target || 
            typeof d.source.x !== 'number' || typeof d.source.y !== 'number' ||
            typeof d.target.x !== 'number' || typeof d.target.y !== 'number') {
          return ""; // Return empty path for invalid data
        }

        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const angle = Math.atan2(dy, dx);
        
        // Calculate control points for a more natural curve
        const sourceRadius = (d.source.id === "industry") ? 80 : 40;
        const targetRadius = (d.target.id === "industry") ? 80 : 40;
        
        // Starting and ending points adjusted for node radius
        const startX = d.source.x + sourceRadius * Math.cos(angle);
        const startY = d.source.y + sourceRadius * Math.sin(angle);
        
        // Adjust end point to account for arrowhead
        const endX = d.target.x - (targetRadius + 20) * Math.cos(angle);
        const endY = d.target.y - (targetRadius + 20) * Math.sin(angle);
        
        // Create a curved path with a control point offset from the midpoint
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Offset perpendicular to the line between nodes
        const perpX = -Math.sin(angle) * 50; // Adjust this value for curvature
        const perpY = Math.cos(angle) * 50;  // Adjust this value for curvature
        
        const controlX = midX + perpX;
        const controlY = midY + perpY;
        
        return `M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`;
      });
    });

    // Drag functions (limited movement to maintain the overall layout)
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.1).restart();
    }

    function dragged(event, d) {
      // Allow limited dragging but maintain circular structure
      if (d.id !== "industry") {
        const dx = event.x - width/2;
        const dy = event.y - height/2;
        const angle = Math.atan2(dy, dx);
        const radius = 400; // Reduced radius
        
        d.x = width/2 + radius * Math.cos(angle);
        d.y = height/2 + radius * Math.sin(angle);
      } else {
        // Allow the industry node to be positioned freely
        d.x = event.x;
        d.y = event.y;
      }
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default IndustryLifeCycleVisualization;