import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const AttributeVisualization = ({ data }) => {
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current || !data) return;
    
    // Clear any previous visualization
    d3.select(containerRef.current).selectAll('*').remove();
    
    // Create the visualization
    simulationRef.current = createAttributeVisualization(data, containerRef.current);
    
    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [data]);
  
  return (
    <div 
      id="visualization-container" 
      ref={containerRef} 
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const createAttributeVisualization = (data, containerElement) => {
  // Get container dimensions
  const container = d3.select(containerElement);
  const width = 800;
  const height = 600;
  
  // Create SVG
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('background-color', '#fff');
  
  // Create main group
  const g = svg.append('g');
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => g.attr('transform', event.transform));
  
  svg.call(zoom);
  
  // Modify forces for better layout and specific positioning
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges).id(d => d.id).distance(50))
    .force('charge', d3.forceManyBody().strength(-500))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(100));
  
  const nameNode = data.nodes.find(n => n.name === 'Name');
  const firstNameNode = data.nodes.find(n => n.name === 'First Name');
  const lastNameNode = data.nodes.find(n => n.name === 'Last Name');
  
  if (nameNode && firstNameNode && lastNameNode) {
    // Add a special positioning force just for these nodes
    simulation.force('name-positioning', d3.forceRadial()
      .radius(60)
      .x(function(d) {
        if (d === nameNode) return width / 2;
        return null;
      })
      .y(function(d) {
        if (d === nameNode) return height / 2;
        if (d === firstNameNode) return nameNode.y - 40;
        if (d === lastNameNode) return nameNode.y - 40;
        return null;
      })
      .strength(function(d) {
        if (d === nameNode || d === firstNameNode || d === lastNameNode) return 0.8;
        return 0;
      })
    );
  }
  
  // Create links
  const links = g.append('g')
    .selectAll('line')
    .data(data.edges)
    .join('line')
    .style('stroke', '#000000')
    .style('stroke-width', 1);
  
  // Create nodes
  const nodes = g.append('g')
    .selectAll('g')
    .data(data.nodes)
    .join('g')
    .attr('class', d => `node ${d.type}`)
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));
  
  // Add shapes to nodes with updated styles
  nodes.each(function(d) {
    const node = d3.select(this);
    
    if (d.type === 'entity') {
      // Entity (rectangle)
      node.append('rect')
        .attr('width', 100)
        .attr('height', 40)
        .attr('x', -50)
        .attr('y', -20)
        .style('fill', '#F0F8FF') // Light blue background
        .style('stroke', '#000') 
        .style('stroke-width', 2);
    } else {
      // Attribute (ellipse) - increased size
      const baseEllipse = node.append('ellipse')
        .attr('rx', 50)
        .attr('ry', 30)
        .style('fill', '#F5F5F5') // Light gray background
        .style('stroke', '#000')
        .style('stroke-width', 1.2);
      
      // Style based on attribute category
      if (d.name === 'Age') {
        // Derived attribute (dashed circle)
        baseEllipse.style('stroke-dasharray', '3,3')
                   .style('fill', '#FFFACD'); // Light yellow background
      }
      else if (d.name === 'Courses') {
        // Add second ellipse for multi-valued attributes
        node.append('ellipse')
          .attr('rx', 54)
          .attr('ry', 34)
          .style('fill', 'none')
          .style('stroke', '#000')
          .style('stroke-width', 1.2);
        baseEllipse.style('fill', '#E6E6FA'); // Lavender background
      }
      else if (d.category === 'multivalued') {
        // Add second ellipse for multi-valued attributes
        node.append('ellipse')
          .attr('rx', 54)
          .attr('ry', 34)
          .style('fill', 'none')
          .style('stroke', '#000')
          .style('stroke-width', 1.2);
        baseEllipse.style('fill', '#E6E6FA'); // Lavender background
      }
      
      // Special background colors for specific attributes
      if (d.name === 'Student ID') {
        baseEllipse.style('fill', '#FFE4E1'); // Misty rose for key attribute
      } else if (d.name === 'Name') {
        baseEllipse.style('fill', '#E0FFFF'); // Light cyan for composite attribute
      } else if (d.name === 'Address') {
        baseEllipse.style('fill', '#F0FFF0'); // Honeydew for simple attribute
      }
    }
    
    // Add text with color coding and increased font size
    const text = node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '13px')
      .style('font-family', 'Arial')
      .style('font-weight', 'bold')
      .text(d.name);
    
    // Assign text colors based on attribute type or name
    if (d.name === 'Student') {
      text.style('fill', '#000000');
    } else if (d.name === 'Student ID') {
      text.style('fill', '#8B0000'); // Dark red for key attribute
    } else if (d.name === 'Name') {
      text.style('fill', '#0000CD'); // Medium blue for composite attribute
    } else if (d.name === 'Age') {
      text.style('fill', '#8B4513'); // Saddle brown for derived attribute
    } else if (d.name === 'Courses') {
      text.style('fill', '#4B0082'); // Indigo for multi-valued attribute
    } else if (d.name === 'Address') {
      text.style('fill', '#006400'); // Dark green for simple attribute
    } else if (d.category === 'prime') {
      text.style('fill', '#FF0000');  // Red for prime attributes
    } else if (d.category === 'composite') {
      text.style('fill', '#0000FF');  // Blue for composite attributes
    } else {
      text.style('fill', '#000000'); // Black for others
    }
    
    // Underline Student ID
    if (d.name === 'Student ID') {
      text.append('tspan')
        .attr('x', 0)
        .attr('dy', '1.2em')
        .text('___________')
        .style('font-size', '10px')
        .style('fill', '#8B0000');
    }
    
    // Add node type labels below the node
    let labelText = '';
    if (d.name === 'Student') {
      labelText = 'Student Entity';
    } else if (d.name === 'Name') {
      labelText = 'Composite Attribute';
    } else if (d.name === 'Age') {
      labelText = 'Derived Attribute';
    } else if (d.name === 'Courses') {
      labelText = 'Multi-Valued Attribute';
    } else if (d.name === 'Address') {
      labelText = 'Simple Attribute';
    } else if (d.name === 'Student ID') {
      labelText = 'Key Attribute';
    }
    
    if (labelText) {
      const label = node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y', 40)
        .style('font-size', '12px')
        .style('font-family', 'Arial')
        .style('font-style', 'Bold')
        .text(labelText);
          
      // Assign label colors to match node text
      if (d.name === 'Student') {
        label.style('fill', '#000000');
      } else if (d.name === 'Student ID') {
        label.style('fill', '#8B0000');
      } else if (d.name === 'Name') {
        label.style('fill', '#0000CD');
      } else if (d.name === 'Age') {
        label.style('fill', '#8B4513');
      } else if (d.name === 'Courses') {
        label.style('fill', '#4B0082');
      } else if (d.name === 'Address') {
        label.style('fill', '#006400');
      }
    }
  });
  
  // Update positions on tick
  simulation.on('tick', () => {
    links
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    nodes.attr('transform', d => `translate(${d.x},${d.y})`);
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
  
  // Start simulation
  simulation.alpha(1).restart();
  return simulation;
};

export default AttributeVisualization;