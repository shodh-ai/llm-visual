import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const PESTELVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) {
      console.error("Invalid data for PESTEL visualization");
      return;
    }

    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    container.selectAll("*").remove();

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create a force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges || []).id(d => d.id).distance(250))
      .force("charge", d3.forceManyBody().strength(-1200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Define color mapping for PESTEL categories
    const colorMap = {
      "political": "#c13030", // Red
      "economic": "#d67d29", // Orange
      "social": "#d6b429", // Yellow
      "technology": "#4b9e56", // Green
      "environment": "#2a5b8f", // Blue
      "legal": "#7e4fac" // Purple
    };

    // Draw edges (lines)
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.edges)
      .enter().append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Draw nodes as hexagons with text
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter().append("g")
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

    // Helper function to create hexagon path
    function hexagonPath(radius) {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) - (Math.PI / 6);
        points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
      }
      return d3.line()(points) + "Z";
    }

    // Append hexagon shapes for nodes
    node.append("path")
      .attr("d", hexagonPath(120))
      .attr("fill", d => d.id === "pestel" ? "#555" : colorMap[d.id])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Append primary label (node name)
    node.append("text")
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .attr("dy", d => d.id === "pestel" ? "10" : "-50")
      .style("fill", "#fff")
      .style("font-size", d => d.id === "pestel" ? "40px" : "20px")
      .style("font-weight", "bold")
      .text(d => d.name.toUpperCase());

    // Function to render property list
    const renderProperties = (selection, nodeData) => {
      if (!nodeData.properties || nodeData.properties.length === 0) return;
      
      selection.selectAll(".property-text")
        .data(nodeData.properties)
        .enter()
        .append("text")
        .attr("class", "property-text")
        .attr("text-anchor", "middle")
        .attr("dy", (d, i) => -20 + (i * 22))
        .style("fill", "#fff")
        .style("font-size", "16px")
        .text(d => `- ${d}`);
    };

    // Add property lists to nodes
    node.each(function(d) {
      if (d.id !== "pestel") {
        renderProperties(d3.select(this), d);
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
      d.fx = null;
      d.fy = null;
    }

    // Optional: Add initial fixed positions for a hexagonal layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 400;
    let i = 0;
    
    data.nodes.forEach(node => {
      if (node.id === "pestel") {
        node.fx = centerX;
        node.fy = centerY;
      } else {
        const angle = ((i * Math.PI / 3) - (Math.PI / 6));
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
        i++;
      }
    });

    return () => {
      simulation.stop();
    }
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default PESTELVisualization;