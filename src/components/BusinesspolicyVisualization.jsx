import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const BusinessPolicyFlow = () => {
  const componentsRef = useRef(null);
  const typesRef = useRef(null);

  useEffect(() => {
    // Define separate data for components and types
    const componentsData = {
      nodes: [
        {
          id: "center1",
          name: "Components of Business Policies",
          type: "center"
        },
        {
          id: "comp1",
          name: "Decision Making Guidelines",
          type: "component"
        },
        {
          id: "comp2",
          name: "Organizational Culture",
          type: "component"
        },
        {
          id: "comp3",
          name: "Corporate Governance Frameworks",
          type: "component"
        },
        {
          id: "comp4",
          name: "Sustainability and Ethics Policies",
          type: "component"
        },
        {
          id: "comp5",
          name: "Risk Management Strategies",
          type: "component"
        }
      ],
      edges: [
        {
          source: "comp1",
          target: "center1",
          type: "unidirectional"
        },
        {
          source: "comp2",
          target: "center1",
          type: "unidirectional"
        },
        {
          source: "comp3",
          target: "center1",
          type: "unidirectional"
        },
        {
          source: "comp4",
          target: "center1",
          type: "unidirectional"
        },
        {
          source: "comp5",
          target: "center1",
          type: "unidirectional"
        }
      ]
    };

    const typesData = {
      nodes: [
        {
          id: "center2",
          name: "Types of Business Policies",
          type: "center"
        },
        {
          id: "type1",
          name: "Corporate Policies",
          type: "type"
        },
        {
          id: "type2",
          name: "Functional Policies",
          type: "type"
        },
        {
          id: "type3",
          name: "Operational Policies",
          type: "type"
        }
      ],
      edges: [
        {
          source: "center2",
          target: "type1",
          type: "unidirectional"
        },
        {
          source: "center2",
          target: "type2",
          type: "unidirectional"
        },
        {
          source: "center2",
          target: "type3",
          type: "unidirectional"
        }
      ]
    };

    // Create the visualizations
    createVisualization(componentsRef.current, componentsData, "#4a90e2", "#2c3e50");
    createVisualization(typesRef.current, typesData, "#e57373", "#c62828");
  }, []);

  // Function to create a D3 visualization
  const createVisualization = (container, data, nodeColor, centerColor) => {
    if (!container || !data || !data.nodes || !data.edges) {
      console.error('Invalid container or data format');
      return;
    }

    // Select the container and get its dimensions
    const d3Container = d3.select(container);
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // Clear any existing SVG
    d3Container.selectAll('*').remove();

    // Append an SVG
    const svg = d3Container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#f0f4f8');

    // Create a force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('charge', d3.forceManyBody().strength(-300))
      .force('collision', d3.forceCollide().radius(60))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('link', d3.forceLink(data.edges)
        .id(d => d.id)
        .distance(150)
      );

    // Draw the edges (links) with direction
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2');

    // Draw the nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      );

    // Append circles for each node
    node.append('circle')
      .attr('r', 50)
      .attr('fill', d => {
        // Center node gets a darker color
        return d.type === "center" ? centerColor : nodeColor;
      });

    // Append text labels inside each node
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('fill', '#fff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('font-family', 'sans-serif')
      .each(function(d) {
        // Handle text wrapping for better fit
        const text = d3.select(this);
        const words = d.name.split(/\s+/);
        const lineHeight = 1.1; // ems
        
        let line = [];
        let lineNumber = 0;
        const y = 0;
        const dy = 0;
        let tspan = text.append("tspan")
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", dy + "em");
        
        words.forEach(word => {
          line.push(word);
          tspan.text(line.join(" "));
          
          if (tspan.node().getComputedTextLength() > 90) { // adjust based on circle size
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan")
              .attr("x", 0)
              .attr("y", y)
              .attr("dy", ++lineNumber * lineHeight + dy + "em")
              .text(word);
          }
        });
      });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // Drag functions
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      // Keep center nodes pinned, let others float
      if (d.type !== "center") {
        d.fx = null;
        d.fy = null;
      } else {
        // Pin center node to center
        d.fx = width / 2;
        d.fy = height / 2;
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      gap: '20px',
      margin: '0 auto'
    }}>
      <div
        ref={componentsRef}
        style={{
          flex: 1,
          height: '500px',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '10px'
        }}
      />
      <div
        ref={typesRef}
        style={{
          flex: 1,
          height: '500px',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '10px'
        }}
      />
    </div>
  );
};

export default BusinessPolicyFlow;