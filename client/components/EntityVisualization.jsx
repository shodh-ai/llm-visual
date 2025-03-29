import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const EntityVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    // Clear any existing content
    d3.select(containerRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 800;

    // Create SVG
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // (Optional) Section titles or labels
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height / 6 + 80)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-lg font-bold')
      .text('Entity-Relationship (ER) model');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2 + 80)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-lg font-bold')
      .text('Strong Entity & Weak Entity');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', (5 * height) / 6 + 80)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-lg font-bold')
      .text('Multivalued & Associative Entity');

    // Define arrow markers
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-10 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M-10,-5L0,0L-10,5')
      .attr('fill', '#ff5733');

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges)
        .id(d => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      // Increase collision radius to avoid overlapping rectangles
      .force('collision', d3.forceCollide().radius(d => {
        // If it's an entity or weak-entity, they are bigger, so use bigger radius
        if (d.type === 'entity' || d.type === 'weak-entity' || d.type === 'associative') {
          return 60;
        } else if (d.type === 'relationship') {
          return 50;
        } else {
          // attribute or multivalued
          return 35;
        }
      }));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('class', 'relationship-link')
      .style('stroke', '#ff5733')
      .style('stroke-width', 2)
      .attr('marker-end', d => {
        // We only show arrowheads on certain edges
        // For example, skip arrowheads for attribute edges
        if (d.type === 'attribute') {
          return null;
        }
        return 'url(#arrowhead)';
      });

    // Create nodes (groups)
    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('class', 'er-node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Draw shapes for each node based on `type`
    node.each(function(d) {
      const erNode = d3.select(this);

      // 1. Associative entity
      if (d.type === 'associative') {
        // Typically a combination of a rectangle + diamond or something similar
        // We'll replicate your original code for "works_on" but check the type:
        erNode.append('rect')
          .attr('width', 120)
          .attr('height', 50)
          .attr('x', -60)
          .attr('y', -25)
          .style('fill', '#1e3a8a')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);

        erNode.append('polygon')
          .attr('points', '-55,0 0,-25 55,0 0,25')
          .style('fill', '#047857')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);
      }
      // 2. Strong entity
      else if (d.type === 'entity') {
        erNode.append('rect')
          .attr('width', 120)
          .attr('height', 50)
          .attr('x', -60)
          .attr('y', -25)
          .style('fill', '#1e3a8a')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);
      }
      // 3. Relationship (diamond)
      else if (d.type === 'relationship') {
        erNode.append('polygon')
          .attr('points', '-50,0 0,-30 50,0 0,30')
          .style('fill', '#047857')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);
      }
      // 4. Weak entity (double rectangle)
      else if (d.type === 'weak-entity') {
        erNode.append('rect')
          .attr('width', 130)
          .attr('height', 60)
          .attr('x', -65)
          .attr('y', -30)
          .style('fill', 'none')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);

        erNode.append('rect')
          .attr('width', 120)
          .attr('height', 50)
          .attr('x', -60)
          .attr('y', -25)
          .style('fill', '#1e3a8a')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);
      }
      // 5. Single-valued attribute
      else if (d.type === 'attribute') {
        erNode.append('circle')
          .attr('r', 25)
          .style('fill', 'white')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);
      }
      // 6. Multivalued attribute (double circle)
      else if (d.type === 'multivalued') {
        erNode.append('circle')
          .attr('r', 25)
          .style('fill', 'white')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);

        erNode.append('circle')
          .attr('r', 30)
          .style('fill', 'none')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);
      }
      // Default fallback
      else {
        erNode.append('circle')
          .attr('r', 30)
          .style('fill', '#ccc')
          .style('stroke', '#ff5733')
          .style('stroke-width', 2);
      }

      // Add node text
      erNode.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.40em')
        .attr('fill',
          d.type === 'attribute' || d.type === 'multivalued'
            ? '#000000'
            : '#ffffff'
        )
        .attr('class', 'text-sm font-bold')
        .style('font-size', '12px')
        .text(d.name || d.id);
    });

    // On each simulation tick, update positions
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

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

    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div
      id="visualization-container"
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    />
  );
};

export default EntityVisualization;
