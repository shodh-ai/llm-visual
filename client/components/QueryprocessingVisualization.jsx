import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const QueryProcessingVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      console.error('Invalid data format for query processing visualization');
      return;
    }

    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const operatorWidth = 250;
    const operatorPadding = 10;

    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#eef2f6');

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', event => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Calculate operator box height based on details (properties/columns)
    data.nodes.forEach(node => {
      const details = node.properties || node.columns || [];
      node.height = 40 + details.length * 25 + operatorPadding;
    });

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges || [])
        .id(d => d.id)
        .distance(300)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('collide', d3.forceCollide().radius(() => operatorWidth / 2 + 50).strength(1))
      .force('x', d3.forceX(0).strength(0.1))
      .force('y', d3.forceY(0).strength(0.1));

    if (data.edges) {
      const connections = g
        .selectAll('.connection')
        .data(data.edges)
        .join('g')
        .attr('class', 'connection');

      connections.append('line')
        .attr('class', 'connection-line')
        .style('stroke', '#4a5568')
        .style('stroke-width', '2px')
        .style('stroke-dasharray', '4,4')
        .style('opacity', 0.7);

      connections.append('text')
        .attr('class', 'connection-label')
        .style('fill', '#2d3748')
        .style('font-size', '12px')
        .style('font-family', 'monospace')
        .text(d => d.description || '');
    }

    const operators = g
      .selectAll('.operator')
      .data(data.nodes)
      .join('g')
      .attr('class', 'operator')
      .call(
        d3.drag()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded)
      );

    operators.append('rect')
      .attr('class', 'operator-bg')
      .attr('x', -operatorWidth / 2)
      .attr('y', d => -d.height / 2)
      .attr('width', operatorWidth)
      .attr('height', d => d.height)
      .attr('rx', 5)
      .style('fill', '#ffffff')
      .style('stroke', '#2c3e50')
      .style('stroke-width', '2px');

    operators.append('rect')
      .attr('class', 'operator-header')
      .attr('x', -operatorWidth / 2)
      .attr('y', d => -d.height / 2)
      .attr('width', operatorWidth)
      .attr('height', 40)
      .attr('rx', 5)
      .style('fill', '#2c3e50');

    operators.append('text')
      .attr('class', 'operator-name')
      .attr('x', -operatorWidth / 2 + 10)
      .attr('y', d => -d.height / 2 + 25)
      .style('fill', '#ffffff')
      .style('font-weight', 'bold')
      .style('font-size', '16px')
      .style('font-family', 'sans-serif')
      .text(d => d.name);

    operators.each(function (d) {
      const opGroup = d3.select(this);
      const startY = -d.height / 2 + 50;
      const details = d.properties || d.columns || [];
      details.forEach((detail, i) => {
        opGroup.append('text')
          .attr('x', -operatorWidth / 2 + 10)
          .attr('y', startY + i * 25)
          .style('fill', '#2c3e50')
          .style('font-family', 'monospace')
          .style('font-size', '12px')
          .text(
            detail.name +
            ' : ' +
            detail.type +
            (detail.primary ? ' (PK)' : '') +
            (detail.foreign ? ' (FK)' : '')
          );
      });
    });

    simulation.on('tick', () => {
      if (data.edges) {
        g.selectAll('.connection').each(function (d) {
          const line = d3.select(this).select('.connection-line');
          const label = d3.select(this).select('.connection-label');

          if (!d.source || !d.target) return;

          const sourceX = d.source.x || 0;
          const sourceY = d.source.y || 0;
          const targetX = d.target.x || 0;
          const targetY = d.target.y || 0;

          line.attr('x1', sourceX)
              .attr('y1', sourceY)
              .attr('x2', targetX)
              .attr('y2', targetY);

          const midX = (sourceX + targetX) / 2;
          const midY = (sourceY + targetY) / 2;
          label.attr('x', midX)
               .attr('y', midY - 5)
               .style('text-anchor', 'middle');
        });
      }
      operators.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

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

    return () => {
      simulation.stop();
    };
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: "500px"}} />;
};

export default QueryProcessingVisualization; 
