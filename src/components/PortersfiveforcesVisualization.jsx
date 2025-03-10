import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const PortersFiveForcesVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {

    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth || 800;
    const height = container.node().clientHeight || 600;
    container.selectAll("*").remove();

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);

    // Find the center node (industry rivalry)
    const centerNode = data.nodes.find(node => node.id === "industry_rivalry");

    // Define initial positions
    data.nodes.forEach(node => {
      switch(node.id) {
        case "industry_rivalry":
          node.x = width / 2;
          node.y = height / 2;
          break;
        case "threat_of_entry":
          node.x = width / 2;
          node.y = height / 4;
          break;
        case "supplier_power":
          node.x = width / 4;
          node.y = height / 2;
          break;
        case "buyer_power":
          node.x = 3 * width / 4;
          node.y = height / 2;
          break;
        case "threat_of_substitutes":
          node.x = width / 2;
          node.y = 3 * height / 4;
          break;
      }
    });

    // Define node colors
    const colorMap = {
      "industry_rivalry": "#F8D0A9",    
      "threat_of_entry": "#B3CCFF",      
      "supplier_power": "#D8C3E4",      
      "buyer_power": "#FFCCCC",         
      "threat_of_substitutes": "#E4F8C3"  
    };

    // Define arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 48)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#666");

    // Create a force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges).id(d => d.id).distance(200))
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("center", d3.forceCenter(width / 2, height / 2))
      // Add these forces to better maintain the pentagon-like structure
      .force("x", d3.forceX().x(d => {
        if (d.id === "industry_rivalry") return width / 2;
        if (d.id === "threat_of_entry") return width / 2;
        if (d.id === "supplier_power") return width / 4;
        if (d.id === "buyer_power") return 3 * width / 4;
        if (d.id === "threat_of_substitutes") return width / 2;
        return width / 2;
      }).strength(0.1))
      .force("y", d3.forceY().y(d => {
        if (d.id === "industry_rivalry") return height / 2;
        if (d.id === "threat_of_entry") return height / 4;
        if (d.id === "supplier_power") return height / 2;
        if (d.id === "buyer_power") return height / 2;
        if (d.id === "threat_of_substitutes") return 3 * height / 4;
        return height / 2;
      }).strength(0.1));

    // Draw edges with arrows
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.edges)
      .enter().append("line")
      .attr("stroke", "#666")
      .attr("stroke-width", 3)
      .attr("marker-end", "url(#arrow)");

    // Draw nodes with different shapes and labels
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter().append("g")
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

    // Circle for center node (industry rivalry)
    node.filter(d => d.id === "industry_rivalry")
      .append("circle")
      .attr("r", 70)
      .attr("fill", d => colorMap[d.id])
      .attr("stroke", "#333")
      .attr("stroke-width", 1);

    // Rounded rectangles for the other forces
    node.filter(d => d.id !== "industry_rivalry")
      .append("rect")
      .attr("width", 200)
      .attr("height", 80)
      .attr("rx", 20)
      .attr("ry", 20)
      .attr("fill", d => colorMap[d.id])
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("x", -100)
      .attr("y", -40);

    // Add text labels with word wrapping for better readability
    node.each(function(d) {
      const g = d3.select(this);
      const text = g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .attr("fill", "#333")
        .attr("font-weight", "bold")
        .style("font-size", "16px")
        .style("pointer-events", "none");
        
      // Handle word wrapping for rectangle nodes
      if (d.id !== "industry_rivalry") {
        const words = d.name.split(/\s+/);
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const y = 0;
        const x = 0;
        const width = 180; // Slightly less than rect width
        
        for (let i = 0; i < words.length; i++) {
          let word = words[i];
          let testLine = [...line, word].join(" ");
          
          // Check if we need to create a new line
          if (testLine.length > 20 && line.length > 0) {
            text.append("tspan")
              .attr("x", x)
              .attr("y", y)
              .attr("dy", (lineNumber * lineHeight) + "em")
              .text(line.join(" "));
              
            line = [word];
            lineNumber++;
          } else {
            line.push(word);
          }
        }
        
        // Add the last line
        if (line.length > 0) {
            text.append("tspan")
              .attr("x", x)
              .attr("y", y)
              .attr("dy", (lineNumber * lineHeight) + "em")
              .text(line.join(" "));
          }
      } else {
        // Center node is simpler
        text.text(d.name);
      }
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x}, ${d.y})`);
    });

    // Drag functions to make nodes movable
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

  return <div ref={containerRef} style={{ width: '100%', height: '100%'}} />;
};

export default PortersFiveForcesVisualization;