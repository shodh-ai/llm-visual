import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const MobiledbVisualization = ({ data, onNodeClick }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (
      !data ||
      !data.nodes ||
      !Array.isArray(data.nodes) ||
      data.nodes.length === 0 ||
      !data.edges ||
      !Array.isArray(data.edges)
    ) {
      console.error("Invalid data format for mobile database visualization");
      return;
    }

    const container = d3.select(containerRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear any existing content
    container.selectAll("*").remove();

    // Create SVG with dark background
    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", "#0a1128"); // Dark navy background

    // Define a glow filter for the phone outline tinted with pink (#f49cbb)
    const defs = svg.append("defs");
    const glowFilter = defs
      .append("filter")
      .attr("id", "phone-glow");

    glowFilter
      .append("feGaussianBlur")
      .attr("in", "SourceGraphic")
      .attr("stdDeviation", "2.5")
      .attr("result", "blur");

    glowFilter
      .append("feColorMatrix")
      .attr("in", "blur")
      .attr("type", "matrix")
      .attr(
        "values",
        "0 0 0 0 0.96  0 0 0 0 0.61  0 0 0 0 0.73  0 0 0 1 0"
      )
      .attr("result", "pinkBlur");

    const feMerge = glowFilter.append("feMerge");
    feMerge
      .append("feMergeNode")
      .attr("in", "pinkBlur");
    feMerge
      .append("feMergeNode")
      .attr("in", "SourceGraphic");

    // Create a tooltip div (hidden by default)
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("id", "mobiledb-tooltip")
      .style("position", "absolute")
      .style("padding", "6px 10px")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "#ffffff")
      .style("border", "1px solid #f49cbb") // Pink border accent
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("opacity", 0);

    // Heading text with a pink stroke outline for accent
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 100) // Adjust as needed
      .attr("text-anchor", "middle")
      .style("fill", "#fafafa")
      .style("stroke", "#daddd8") // Light pink accent
      .style("stroke-width", "1px")
      .style("font-weight", "bold")
      .style("font-size", "32px")
      .style("font-family", "Trebuchet MS, sans-serif")
      .text("Mobile Database");

    // Find root node (mobile phone)
    const rootNode = data.nodes.find((n) => n && n.id === "root");
    if (!rootNode) {
      console.error("Root node not found in mobile database data");
      return;
    }

    // Database nodes
    const dbNodes = data.nodes.filter((n) => n.id !== "root");

    // Setup force simulation
    const simulation = d3
      .forceSimulation()
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("collision", d3.forceCollide().radius(60));

    // Create node data for simulation
    const nodeData = [
      { ...rootNode, x: width / 2, y: height / 2, fixed: true },
      ...dbNodes.map((node, i) => {
        const angle = i * (Math.PI / 2) + Math.PI / 4; // 45, 135, 225, 315 degrees
        return {
          ...node,
          x: width / 2 + 200 * Math.cos(angle),
          y: height / 2 + 200 * Math.sin(angle),
        };
      }),
    ];

    // Add nodes to simulation
    simulation.nodes(nodeData);

    // Create links
    const linkData = data.edges.map((edge) => {
      const source = nodeData.find((n) => n.id === edge.source);
      const target = nodeData.find((n) => n.id === edge.target);
      return { ...edge, source, target };
    });

    // Add link force
    simulation.force(
      "link",
      d3.forceLink(linkData).id((d) => d.id).distance(200)
    );

    // Fix the position of the central node
    nodeData[0].fx = width / 2;
    nodeData[0].fy = height / 2;

    // Create links (paths)
    const links = svg
      .append("g")
      .selectAll(".link")
      .data(linkData)
      .join("path")
      .attr("class", "link")
      .style("fill", "none")
      .style("stroke", "#5bc0be") // Teal stroke for dark mode
      .style("stroke-width", 2)
      .style("stroke-dasharray", "5,5");

    // [Link labels removed]

    // Create mobile phone group with tooltip events
    const mobile = svg
      .append("g")
      .attr("class", "mobile-node")
      .style("cursor", "pointer")
      .datum(nodeData[0])
      .on("click", (event, d) => onNodeClick && onNodeClick(d))
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html("Mobile Phone")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // Mobile body with glow filter
    mobile
      .append("rect")
      .attr("x", -40)
      .attr("y", -70)
      .attr("width", 80)
      .attr("height", 140)
      .attr("rx", 15)
      .attr("ry", 15)
      .style("fill", "#1c2541")
      .style("stroke", "#5bc0be")
      .style("stroke-width", 3)
      .style("filter", "url(#phone-glow)"); 

    // Mobile screen
    mobile
      .append("rect")
      .attr("x", -35)
      .attr("y", -50)
      .attr("width", 70)
      .attr("height", 100)
      .style("fill", "#fafafa") 
      .style("stroke", "#5bc0be")
      .style("stroke-width", 1);

    // Camera
    mobile
      .append("circle")
      .attr("cx", -20)
      .attr("cy", -60)
      .attr("r", 3)
      .style("fill", "#fafafa");

    // Speaker
    mobile
      .append("rect")
      .attr("x", -15)
      .attr("y", -62)
      .attr("width", 30)
      .attr("height", 4)
      .attr("rx", 2)
      .attr("ry", 2)
      .style("fill", "#fafafa");

    // Home button
    mobile
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 55)
      .attr("r", 10)
      .style("fill", "#fafafa")
      .style("stroke", "#3a506b")
      .style("stroke-width", 1);

    // Create database nodes with tooltip events
    const nodes = svg
      .append("g")
      .selectAll(".db-node")
      .data(nodeData.slice(1))
      .join("g")
      .attr("class", "db-node")
      .style("cursor", "pointer")
      .on("click", (event, d) => onNodeClick && onNodeClick(d))
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(d.properties)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      })
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    nodes
      .append("circle")
      .attr("r", 60)
      .style("fill", "#3a506b")
      .style("stroke", "#5bc0be")
      .style("stroke-width", 3);

    // Text inside circles
    nodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.8em")
      .style("fill", "#fafafa")
      .style("font-weight", "bold")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .each(function (d) {
        const text = d3.select(this);
        const words = d.name.split(" ");
        words.forEach((word, i) => {
          text
            .append("tspan")
            .attr("x", 0)
            .attr("dy", i ? "1.2em" : 0)
            .text(word);
        });
      });

    // Feature descriptions inside the circles
    nodes.each(function (d) {
      const node = d3.select(this);
      const description = data.edges.find((e) => e.target === d.id)?.description;
      if (description) {
        node
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "3em")
          .style("fill", "#fafafa")
          .style("font-size", "10px")
          .style("font-style", "italic")
          .text(description);
      }
    });

    // Update simulation on tick
    simulation.on("tick", () => {
      // Mobile phone remains fixed at center
      mobile.attr("transform", (d) => `translate(${d.x},${d.y})`);
      // Update database nodes
      nodes.attr("transform", (d) => `translate(${d.x},${d.y})`);
      // Curved link paths
      links.attr("d", (d) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });
    });

    // Animated dashed edges
    function rotateEdges() {
      svg
        .selectAll(".link")
        .style("stroke-dashoffset", "0")
        .transition()
        .duration(15000)
        .ease(d3.easeLinear)
        .style("stroke-dashoffset", "100")
        .on("end", rotateEdges);
    }
    rotateEdges();

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
      d.fx = null;
      d.fy = null;
    }

    // Highlight functions
    const highlightNode = (nodeId) => {
      // Highlight mobile phone
      mobile
        .select("rect")
        .style("stroke", (d) => (d.id === nodeId ? "#f49cbb" : "#5bc0be"))
        .style("stroke-width", (d) => (d.id === nodeId ? 5 : 3));

      // Highlight database circles remain unchanged
      nodes
        .select("circle")
        .style("stroke", (d) =>
          d.id === nodeId ? "#6fffe9" : "#5bc0be"
        )
        .style("stroke-width", (d) =>
          d.id === nodeId ? 5 : 3
        );

      // Highlight connections
      links
        .style("stroke", (d) =>
          d.source.id === nodeId || d.target.id === nodeId
            ? "#6fffe9"
            : "#5bc0be"
        )
        .style("stroke-width", (d) =>
          d.source.id === nodeId || d.target.id === nodeId ? 4 : 2
        );
    };

    const resetHighlights = () => {
      mobile.select("rect").style("stroke", "#5bc0be").style("stroke-width", 3);
      nodes.select("circle").style("stroke", "#5bc0be").style("stroke-width", 3);
      links.style("stroke", "#5bc0be").style("stroke-width", 2);
    };

    // Expose highlight functions via ref
    if (containerRef.current) {
      containerRef.current.highlightNode = highlightNode;
      containerRef.current.resetHighlights = resetHighlights;
    }

    return () => {
      // Cleanup: remove tooltip div if component unmounts
      tooltip.remove();
      simulation.stop();
    };
  }, [data, onNodeClick]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0a1128",
        borderRadius: "10px",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
      }}
    />
  );
};

export default MobiledbVisualization;
