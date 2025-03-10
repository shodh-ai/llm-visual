import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SWOTVisualization = ({ data, onNodeClick }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    
    if (!data || !data.nodes || data.nodes.length === 0) {
      console.error("Invalid data for SWOT visualization");
      return;
    }

    const container = d3.select(containerRef.current);
    if (!container.node()) {
      console.error("Container ref not available");
      return;
    }

    // Get container dimensions
    const width = container.node().clientWidth || 800; // Fallback width
    const height = 600;
    console.log(`Container dimensions: ${width}x${height}`);
    
    container.selectAll("*").remove();

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Define quadrant colors based on SWOT types
    const getNodeColor = (d) => {
      switch (d.type) {
        case 'strength': return '#87CEEB'; 
        case 'weakness': return '#B0E0E6';  
        case 'opportunity': return '#B0E0E6'; 
        case 'threat': return '#87CEEB';    
        case 'swot': return '#191970';     
        default: return '#3498DB';
      }
    };
    
    // Create a force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges).id(d => d.id).distance(200))
      .force("charge", d3.forceManyBody().strength(-1200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Set initial positions and make them fixed at first for better layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 200;

    data.nodes.forEach(node => {
      if (node.id === "swot") {
        node.x = centerX;
        node.y = centerY;
        node.fx = centerX;
        node.fy = centerY;
      } else if (node.id === "strengths") {
        node.x = centerX - radius;
        node.y = centerY - radius;
        node.fx = centerX - radius;
        node.fy = centerY - radius;
      } else if (node.id === "weaknesses") {
        node.x = centerX + radius;
        node.y = centerY - radius;
        node.fx = centerX + radius;
        node.fy = centerY - radius;
      } else if (node.id === "opportunities") {
        node.x = centerX - radius;
        node.y = centerY + radius;
        node.fx = centerX - radius;
        node.fy = centerY + radius;
      } else if (node.id === "threats") {
        node.x = centerX + radius;
        node.y = centerY + radius;
        node.fx = centerX + radius;
        node.fy = centerY + radius;
      }
    });

    // Draw edges (lines)
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.edges)
      .enter().append("line")
      .attr("stroke", "#0A2744")
      .attr("stroke-width", 4)
      .attr("stroke-opacity", 0.8);

    // Create node groups
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter().append("g")
      .attr("data-id", d => d.id) // Add data-id for easier selection
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
      .on("click", (event, d) => {
        if (onNodeClick) onNodeClick(d);
      });

    // Add shapes to nodes - diamond for center, rounded rectangles for quadrants
    node.each(function(d) {
      const nodeGroup = d3.select(this);
      
      if (d.id === "swot") {
        // Diamond shape for central SWOT node
        nodeGroup.append("path")
          .attr("d", "M0,-80 L80,0 L0,80 L-80,0 Z")
          .attr("fill", getNodeColor(d))
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
          
        // SWOT text in center
        nodeGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.3em")
          .attr("fill", "#fff")
          .attr("font-size", "18px")
          .attr("font-weight", "bold")
          .attr("font-family", "Times new roman")
          .text(d.name || "SWOT Analysis");
      } else {
        // Rounded rectangle for quadrant nodes
        const rectWidth = 200;
        const rectHeight = 140;
        const radius = 10;
        
        nodeGroup.append("rect")
          .attr("x", -rectWidth/2)
          .attr("y", -rectHeight/2)
          .attr("width", rectWidth)
          .attr("height", rectHeight)
          .attr("rx", radius)
          .attr("ry", radius)
          .attr("fill", getNodeColor(d))
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
        
        // Add title text
        nodeGroup.append("text")
          .attr("class", "node-title")
          .attr("text-anchor", "middle")
          .attr("y", -35)
          .attr("fill", "#000")
          .attr("font-size", "22px")
          .attr("font-weight", "bold")
          .attr("font-family", "Times new roman")
          .text(d.name || '');
        
        // Handle properties text with explicit checks for various formats
        let propertiesText = '';
        
        if (Array.isArray(d.properties) && d.properties.length > 0) {
          // If properties is an array, join the array items
          propertiesText = d.properties.join(' ');
        } else if (typeof d.properties === 'string') {
          // If properties is a string, use it directly
          propertiesText = d.properties;
        } else {
          // Default text if properties is missing or invalid
          propertiesText = 'No properties available';
        }
        
        // Split properties into chunks of approximately 25 characters
        const words = propertiesText.split(' ');
        let lines = [];
        let currentLine = '';
        
        // Form lines of reasonable length
        words.forEach(word => {
          if ((currentLine + ' ' + word).length <= 25) {
            currentLine = currentLine ? (currentLine + ' ' + word) : word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        });
        if (currentLine) {
          lines.push(currentLine);
        }
        
        
        
        // Add each line as a separate text element
        lines.forEach((line, i) => {
          nodeGroup.append("text")
            .attr("class", "properties-line")
            .attr("text-anchor", "middle")
            .attr("y", 0 + (i * 20)) // Position each line with 20px spacing
            .attr("fill", "#000")
            .attr("font-size", "18px")
            .attr("font-family", "calibri")
            .text(line);
        });
      }
    });

    // Update positions on every tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x}, ${d.y})`);
    });

    // After a short time, release the fixed positions to allow dragging
    setTimeout(() => {
      data.nodes.forEach(node => {
        if (node.id !== "swot") { // Optionally keep the central node fixed
          node.fx = null;
          node.fy = null;
        }
      });
      simulation.alpha(0.1).restart();
    }, 50);

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
      // Keep positions fixed after dragging for more stable layout
    }

    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default SWOTVisualization;