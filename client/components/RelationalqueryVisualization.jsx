import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RelationalQueryVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      console.error('Invalid data format for relational query visualization');
      return;
    }

    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#f0f4f8');

    // Create a force simulation with a central fixed node ("SQL Query")
    const simulation = d3.forceSimulation(data.nodes)
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('collision', d3.forceCollide().radius(50))
      .force('link', d3.forceLink(data.edges).id(d => d.id).distance(150));

    // Fix the central node ("SQL Query") at the center.
    data.nodes.forEach(d => {
      if (d.id === 'sql') {
        d.fx = width / 2;
        d.fy = height / 2;
      }
    });

    // Draw links
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2');

    // Draw nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

    node.append('circle')
      .attr('r', 40)
      .attr('fill', d => d.id === 'sql' ? '#2c3e50' : '#4a90e2');

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('fill', '#fff')
      .style('font-size', '12px')
      .style('font-family', 'sans-serif')
      .text(d => d.name);

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
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
      if (d.id !== 'sql') {  // Keep central node fixed.
        d.fx = null;
        d.fy = null;
      }
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 500 }} />;
};

export default RelationalQueryVisualization;
