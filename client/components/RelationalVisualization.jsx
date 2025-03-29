import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RelationalVisualization = ({ data, highlightedElements }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      console.error('Invalid data format for relational visualization');
      return;
    }

    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const tableWidth = 250;
    const tablePadding = 10;

    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#f7fafc');

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', event => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // For each node, determine the table's height using its columns/properties
    data.nodes.forEach(node => {
      const columns = node.columns || node.properties || [];
      node.height = 40 + columns.length * 25 + tablePadding;
    });

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges || [])
        .id(d => d.id)
        .distance(300)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.height * tableWidth) / 2));

    // Draw the relationships (edges)
    const links = g.selectAll('.link')
      .data(data.edges || [])
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('data-id', d => `edge-${d.source.id}-${d.target.id}`)
      .style('stroke', '#cbd5e0')
      .style('stroke-width', 2)
      .style('fill', 'none');

    // Create table groups
    const tables = g.selectAll('.table')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('class', 'table')
      .attr('data-id', d => d.id)
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    // Draw table rectangles
    tables.append('rect')
      .attr('width', tableWidth)
      .attr('height', d => d.height)
      .attr('rx', 6)
      .attr('ry', 6)
      .style('fill', '#ffffff')
      .style('stroke', '#e2e8f0')
      .style('stroke-width', 2);

    // Add table headers
    tables.append('rect')
      .attr('width', tableWidth)
      .attr('height', 40)
      .attr('rx', 6)
      .attr('ry', 6)
      .style('fill', '#f1f5f9');

    tables.append('text')
      .attr('x', tableWidth / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .style('font-size', '14px')
      .text(d => d.name);

    // Add table columns
    tables.each(function(d) {
      const table = d3.select(this);
      const columns = d.columns || d.properties || [];
      
      columns.forEach((col, i) => {
        table.append('text')
          .attr('x', tablePadding)
          .attr('y', 60 + i * 25)
          .style('font-size', '12px')
          .text(col.name);
      });
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links.attr('d', d => {
        const sourceX = d.source.x;
        const sourceY = d.source.y;
        const targetX = d.target.x;
        const targetY = d.target.y;
        
        return `M${sourceX},${sourceY}L${targetX},${targetY}`;
      });

      tables.attr('transform', d => `translate(${d.x - tableWidth/2},${d.y - d.height/2})`);
    });

    // Apply highlights if any
    if (highlightedElements && highlightedElements.length > 0) {
      highlightedElements.forEach(element => {
        svg.selectAll(`[data-id="${element.id}"]`)
          .classed('highlighted', true)
          .style('stroke-width', '3px')
          .style('stroke', '#4299e1')
          .raise();
      });
    }

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
      d.fx = null;
      d.fy = null;
    }

  }, [data, highlightedElements]);

  return (
    <div 
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    />
  );
};

export default RelationalVisualization;
