import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const MarketStructuresVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) {
      console.error("Invalid data for Market Structures visualization");
      return;
    }

    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    container.selectAll("*").remove();

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);

    // Define color scale for different market structures
    const colorScale = d3.scaleOrdinal()
      .domain(['central', 'monopolistic', 'perfect', 'oligopsony', 'monopsony', 'oligopoly', 'duopoly', 'monopoly'])
      .range(['#e7e8ec', '#8ca4ca', '#96acee', '#d3f1cd', '#90EE90', '#aeb3b7', '#ebad9f', '#f1c6bf']);

    // Create a force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges || []).id(d => d.id).distance(250))
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw edges (lines)
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.edges)
      .enter().append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 4);

    // Create node groups
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter().append("g")
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

    // Add ellipses for nodes
    node.append("ellipse")
      .attr("rx", d => d.id === "market_structure" ? 90 : 100)
      .attr("ry", d => d.id === "market_structure" ? 90 : 50)
      .attr("fill", d => colorScale(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0);

    // Add text labels
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", d => d.id === "market_structure" ? "#000" : "#000")
      .attr("font-weight", d => d.id === "market_structure" ? "bold" : "")
      .attr("font-family", d => d.id === "market_structure" ? "Times new roman" : "calibri")
      .style("font-size", d => d.id === "market_structure" ? "18px" : "18px")
      .text(d => d.name);

    // Add tooltips for properties if needed
    node.append("title")
      .text(d => {
        if (d.properties && d.properties.length > 0) {
          return d.properties.join("\n");
        }
        return d.name;
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

    return () => {
      simulation.stop();
    };
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default MarketStructuresVisualization;