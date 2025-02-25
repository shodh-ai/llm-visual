import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const GISVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) {
      console.error("Invalid data for GIS visualization");
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
      .force("link", d3.forceLink(data.edges || []).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw edges (lines)
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.edges)
      .enter().append("line")
      .attr("stroke", "#999")
      .attr("stroke-width", 2);

    // Draw nodes as groups containing a circle and text labels
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter().append("g")
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

    // Append larger circles for nodes
    node.append("circle")
      .attr("r", 50)
      .attr("fill", d => d.id === "gis" ? "#2c3e50" : "#4299e1");

    // Append primary label (node name)
    node.append("text")
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .style("fill", "#fff")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(d => d.name);

    // Append secondary label (example) if provided
    node.append("text")
      .attr("class", "example")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .style("fill", "#fff")
      .style("font-size", "10px")
      .text(d => d.example ? d.example : "");

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

    return () => {
      simulation.stop();
    }
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default GISVisualization;
