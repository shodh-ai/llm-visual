import React, { useEffect, useRef, forwardRef } from 'react';
import * as d3 from 'd3';

const BusinessPolicyVisualization = forwardRef((props, ref) => {
  const { data, highlightedElements = [] } = props;
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (!data || !data.nodes || !data.edges) return;
    
    const width = 800;
    const height = 600;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");
    
    // Add a border line at the top and bottom
    svg.append("line")
      .attr("x1", 50)
      .attr("y1", 30)
      .attr("x2", width - 50)
      .attr("y2", 30)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);
      
    svg.append("line")
      .attr("x1", 50)
      .attr("y1", height - 30)
      .attr("x2", width - 50)
      .attr("y2", height - 30)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);
    
    // Create a group for the visualization
    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);
    
    // Filter nodes to only include the main business policy types
    const mainNodes = data.nodes.filter(node => 
      ["business_policies", "corporate_policies", "functional_policies", "operational_policies"].includes(node.id)
    );
    
    // Filter edges to only include connections between main nodes
    const mainEdges = data.edges.filter(edge => 
      mainNodes.some(node => node.id === edge.source) && 
      mainNodes.some(node => node.id === edge.target)
    );
    
    // Create node positions
    const nodePositions = {
      business_policies: { x: 0, y: 0 },
      corporate_policies: { x: 150, y: -120 },
      functional_policies: { x: 150, y: 0 },
      operational_policies: { x: 150, y: 120 }
    };
    
    // Draw edges
    const links = g.selectAll(".link")
      .data(mainEdges)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", d => nodePositions[d.source].x)
      .attr("y1", d => nodePositions[d.source].y)
      .attr("x2", d => nodePositions[d.target].x)
      .attr("y2", d => nodePositions[d.target].y)
      .attr("stroke", "#4a6da7")
      .attr("stroke-width", 2);
    
    // Draw nodes
    const nodes = g.selectAll(".node")
      .data(mainNodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("id", d => `node-${d.id}`)
      .attr("transform", d => `translate(${nodePositions[d.id].x}, ${nodePositions[d.id].y})`);
    
    // Add circles for nodes
    nodes.append("circle")
      .attr("r", d => d.id === "business_policies" ? 80 : 60)
      .attr("fill", d => d.id === "business_policies" ? "#b74c4c" : "#4a6da7")
      .attr("stroke", d => {
        const highlighted = highlightedElements.find(h => h.id === d.id);
        return highlighted ? "#ff9900" : "#2c5282";
      })
      .attr("stroke-width", d => {
        const highlighted = highlightedElements.find(h => h.id === d.id);
        return highlighted ? 3 : 1;
      })
      .attr("opacity", d => {
        const highlighted = highlightedElements.find(h => h.id === d.id);
        return highlighted ? 1 : 0.8;
      })
      .attr("class", d => `node-circle ${d.id}`);
    
    // Add a rectangle for the central node text background
    nodes.filter(d => d.id === "business_policies")
      .append("rect")
      .attr("x", -60)
      .attr("y", -30)
      .attr("width", 120)
      .attr("height", 60)
      .attr("fill", "#b74c4c")
      .attr("rx", 5)
      .attr("ry", 5);
    
    // Add text to nodes
    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => d.id === "business_policies" ? 0 : 0)
      .attr("fill", "white")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .each(function(d) {
        const text = d3.select(this);
        const words = d.name.split(' ');
        
        if (words.length === 1) {
          text.text(d.name);
        } else {
          words.forEach((word, i) => {
            text.append("tspan")
              .attr("x", 0)
              .attr("dy", i === 0 ? 0 : 20)
              .text(word);
          });
        }
      });
    
    // Add Figure 1.2 caption at the bottom
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Figure 1.2 Types of Business Policies");
    
    // Add interactivity
    nodes.style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("stroke", "#ff9900")
          .attr("stroke-width", 3)
          .attr("opacity", 1);
      })
      .on("mouseout", function(event, d) {
        const isHighlighted = highlightedElements.some(h => h.id === d.id);
        if (!isHighlighted) {
          d3.select(this).select("circle")
            .transition()
            .duration(200)
            .attr("stroke", "#2c5282")
            .attr("stroke-width", 1)
            .attr("opacity", 0.8);
        }
      });
    
    // Update highlighted elements when they change
    if (highlightedElements.length > 0) {
      highlightedElements.forEach(element => {
        d3.select(`#node-${element.id}`).select("circle")
          .transition()
          .duration(300)
          .attr("stroke", "#ff9900")
          .attr("stroke-width", 3)
          .attr("opacity", 1);
          
        // If element has a scale property, apply it
        if (element.scale) {
          d3.select(`#node-${element.id}`)
            .transition()
            .duration(300)
            .attr("transform", d => {
              const pos = nodePositions[d.id];
              return `translate(${pos.x}, ${pos.y}) scale(${element.scale})`;
            });
        }
        
        // If element has a strokeColor property, apply it
        if (element.strokeColor) {
          d3.select(`#node-${element.id}`).select("circle")
            .transition()
            .duration(300)
            .attr("stroke", element.strokeColor);
        }
      });
    }
    
  }, [data, highlightedElements]);
  
  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    highlightNode: (nodeId) => {
      d3.select(`#node-${nodeId}`).select("circle")
        .transition()
        .duration(300)
        .attr("stroke", "#ff9900")
        .attr("stroke-width", 3)
        .attr("opacity", 1);
    },
    resetHighlights: () => {
      d3.selectAll(".node-circle")
        .transition()
        .duration(300)
        .attr("stroke", "#2c5282")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8);
    }
  }));
  
  return (
    <div className="visualization-container" style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} width="100%" height="100%"></svg>
    </div>
  );
});

BusinessPolicyVisualization.displayName = 'BusinessPolicyVisualization';

export default BusinessPolicyVisualization;