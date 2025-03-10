import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const StrategicIntentVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) {
      console.error("Invalid data for Strategic Intent visualization");
      return;
    }

    const container = d3.select(containerRef.current);
    container.selectAll("*").remove();
    
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.3;

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Create a hierarchical structure for the concentric circles
    const hierarchyNodes = data.nodes.sort((a, b) => {
      // Sort nodes by their hierarchical level
      const levels = {
        "vision": 4,
        "mission": 3,
        "business_definition": 2,
        "business_model": 1,
        "goals_objectives": 0
      };
      return levels[a.id] - levels[b.id];
    });

    // Define color scale based on the image
    const colorScale = d3.scaleOrdinal()
      .domain(["vision", "mission", "business_definition", "business_model", "goals_objectives"])
      .range(["#ef4444", "#84cc16", "#10b981", "#2563eb", "#1e3a8a"]);
    // Draw concentric circles
    const circleGroup = svg.append("g")
      .attr("transform", `translate(${centerX}, ${centerY})`);

    // Create circle elements with their IDs for referencing later
    const circles = circleGroup.selectAll("circle")
      .data(hierarchyNodes)
      .enter()
      .append("circle")
      .attr("id", d => `circle-${d.id}`)
      .attr("r", (d, i) => {
        // Calculate radius based on the level (innermost is smallest)
        return maxRadius * (1 - i / hierarchyNodes.length);
      })
      .attr("fill", d => colorScale(d.id))
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("opacity", 0.8);

    // Create angled lines with labels similar to the image
    const lineGroup = svg.append("g")
      .attr("transform", `translate(${centerX}, ${centerY})`);
    
    // Define the positions for the labels based on the image
    const labelPositions = [
        { id: "vision", angle: -20 },               // Innermost (red)
        { id: "mission", angle: 0 },                // Second (light green)
        { id: "business_definition", angle: 20 },   // Middle (teal/green)
        { id: "business_model", angle: 40 },        // Fourth (blue)
        { id: "goals_objectives", angle: 60 }       // Outermost (dark blue)
      ];
  
    // Create lines and labels
    labelPositions.forEach(position => {
        const nodeData = hierarchyNodes.find(n => n.id === position.id);
        if (!nodeData) return;
        
        // Find the correct radius for this node based on its position in hierarchy
        const nodeIndex = hierarchyNodes.findIndex(n => n.id === position.id);
        const radius = maxRadius * (1 - nodeIndex / hierarchyNodes.length);
        
        const angleInRadians = (position.angle * Math.PI) / 180;
        
        // Calculate line starting point on the correct circle
        const x1 = radius * Math.cos(angleInRadians);
        const y1 = radius * Math.sin(angleInRadians);
        
        // Calculate line ending point
        const outerRadius = maxRadius + 70;
        const x2 = outerRadius * Math.cos(angleInRadians);
        const y2 = outerRadius * Math.sin(angleInRadians);
        
        // Create a group for line and label
        const lineWithLabelGroup = lineGroup.append("g")
          .attr("class", `line-label-group-${nodeData.id}`)
          .attr("cursor", "pointer");
  
      // Add line
      lineWithLabelGroup.append("line")
        .attr("x1", x1 - 30)
        .attr("y1", y1 - 10)
        .attr("x2", x2 )
        .attr("y2", y2)
        .attr("stroke", "#666")
        .attr("stroke-width", 1.5);
      
      // Add label at the end of the line
      lineWithLabelGroup.append("text")
        .attr("x", x2 + 10 * Math.cos(angleInRadians))
        .attr("y", y2 + 10 * Math.sin(angleInRadians))
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#000")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(nodeData.name);
      
      // Add hover interactions to both line and label group
      lineWithLabelGroup
        .on("mouseover", function() {
          // Highlight the corresponding circle
          d3.select(`#circle-${nodeData.id}`)
            .attr("opacity", 1)
            .attr("stroke", "#fff")
            .attr("stroke-width", 3);
          
          // Highlight the line
          d3.select(this).select("line")
            .attr("stroke", "#000")
            .attr("stroke-width", 2.5);
          
          // Highlight the label
          d3.select(this).select("text")
            .attr("font-weight", "bold")
            .attr("fill", colorScale(nodeData.id));
        })
        .on("mouseout", function() {
          // Reset circle appearance
          d3.select(`#circle-${nodeData.id}`)
            .attr("opacity", 0.8)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);
          
          // Reset line appearance
          d3.select(this).select("line")
            .attr("stroke", "#666")
            .attr("stroke-width", 1.5);
          
          // Reset label appearance
          d3.select(this).select("text")
            .attr("font-weight", "bold")
            .attr("fill", "#000");
        });
    });
    
    // Add circle hover interactions
    circles
      .on("mouseover", function(event, d) {
        // Highlight current circle
        d3.select(this)
          .attr("opacity", 1)
          .attr("stroke", "#fff")
          .attr("stroke-width", 3);
        
        // Highlight corresponding line and label
        d3.select(`.line-label-group-${d.id}`).select("line")
          .attr("stroke", "#000")
          .attr("stroke-width", 2.5);
        
        d3.select(`.line-label-group-${d.id}`).select("text")
          .attr("font-weight", "bold")
          .attr("fill", colorScale(d.id));
      })
      .on("mouseout", function(event, d) {
        // Reset circle appearance
        d3.select(this)
          .attr("opacity", 0.8)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
        
        // Reset line and label appearance
        d3.select(`.line-label-group-${d.id}`).select("line")
          .attr("stroke", "#666")
          .attr("stroke-width", 1.5);
        
        d3.select(`.line-label-group-${d.id}`).select("text")
          .attr("font-weight", "bold")
          .attr("fill", "#000");
      });

    return () => {
      container.selectAll("*").remove();
    };
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default StrategicIntentVisualization;