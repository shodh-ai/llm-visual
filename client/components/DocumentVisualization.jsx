import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const DocumentVisualization = ({ data, highlightedElements, currentTime }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  // Customize how deeply we render nested objects/arrays
  const MAX_DEPTH = 2;         // Stop rendering after 2 levels of nesting
  const LINE_SPACING = 15;     // Vertical spacing between lines
  const FONT_SIZE = 10;        // Font size for fields
  const LINK_DISTANCE = 300;   // Distance between nodes in the force layout

  // Function to calculate collection height based on document content
  // but limiting recursion to MAX_DEPTH.
  const calculateCollectionHeight = (document, level = 0) => {
    let height = 30; // Header row

    const processValue = (value, currentLevel) => {
      // If we've reached MAX_DEPTH, just add a single line for "..."
      if (currentLevel >= MAX_DEPTH) {
        height += LINE_SPACING;
        return;
      }

      if (Array.isArray(value)) {
        height += LINE_SPACING; // For "["
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            processValue(item, currentLevel + 1);
          } else {
            height += LINE_SPACING;
          }
        });
        height += LINE_SPACING; // For "]"
      } else if (typeof value === 'object' && value !== null) {
        // For each key
        Object.entries(value).forEach(([key, val]) => {
          height += LINE_SPACING;
          if (typeof val === 'object' && val !== null) {
            processValue(val, currentLevel + 1);
          }
        });
      }
    };

    processValue(document, level);
    return height;
  };

  // Function to recursively render document content
  // but limit to MAX_DEPTH, showing "..." if deeper.
  const renderDocument = (
    parent,
    content,
    x,
    y,
    level = 0,
    indentSize = 20
  ) => {
    // If we are at or beyond the max depth, just display "..."
    if (level >= MAX_DEPTH) {
      parent
        .append('text')
        .attr('x', x + level * indentSize)
        .attr('y', y)
        .style('fill', '#a0aec0')
        .style('font-family', 'monospace')
        .style('font-size', `${FONT_SIZE}px`)
        .text('...');
      return y + LINE_SPACING;
    }

    if (Array.isArray(content)) {
      // Render array with simplified bracket notation
      parent
        .append('text')
        .attr('x', x + level * indentSize)
        .attr('y', y)
        .style('fill', '#a0aec0')
        .style('font-family', 'monospace')
        .style('font-size', `${FONT_SIZE}px`)
        .text('[');
      content.forEach((item, index) => {
        y += LINE_SPACING;
        if (typeof item === 'object' && item !== null) {
          y = renderDocument(parent, item, x, y, level + 1, indentSize);
        } else {
          parent
            .append('text')
            .attr('x', x + (level + 1) * indentSize)
            .attr('y', y)
            .style('fill', '#e2e8f0')
            .style('font-family', 'monospace')
            .style('font-size', `${FONT_SIZE}px`)
            .text(JSON.stringify(item) + (index < content.length - 1 ? ',' : ''));
        }
      });
      y += LINE_SPACING;
      parent
        .append('text')
        .attr('x', x + level * indentSize)
        .attr('y', y)
        .style('fill', '#a0aec0')
        .style('font-family', 'monospace')
        .style('font-size', `${FONT_SIZE}px`)
        .text(']');
    } else if (typeof content === 'object' && content !== null) {
      // Render object
      Object.entries(content).forEach(([key, value]) => {
        parent
          .append('text')
          .attr('x', x + level * indentSize)
          .attr('y', y)
          .style('fill', '#a0aec0')
          .style('font-family', 'monospace')
          .style('font-size', `${FONT_SIZE}px`)
          .text(`${key}: `);

        if (typeof value === 'object' && value !== null) {
          y += LINE_SPACING;
          y = renderDocument(parent, value, x, y, level + 1, indentSize);
        } else {
          // Render the primitive value
          parent
            .append('text')
            .attr('x', x + level * indentSize + key.length * 7 + 10)
            .attr('y', y)
            .style('fill', '#e2e8f0')
            .style('font-family', 'monospace')
            .style('font-size', `${FONT_SIZE}px`)
            .text(JSON.stringify(value));
        }
        y += LINE_SPACING;
      });
    }
    return y;
  };

  useEffect(() => {
    if (!containerRef.current || !data || !data.nodes) {
      console.error('Missing required data for DocumentVisualization', { data });
      return;
    }

    console.log(
      'DocumentVisualization: Available node IDs:',
      data.nodes.map((node) => node.id)
    );
    console.log(
      'DocumentVisualization: Current highlighted elements:',
      highlightedElements
    );
    console.log('DocumentVisualization: Current time:', currentTime);

    // Get container dimensions
    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    // Clear any existing SVG
    container.selectAll('*').remove();

    // Create SVG
    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#1a202c');

    svgRef.current = svg;

    // Zoom container
    const g = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.2, 2])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Prepare nodes: compute heights with limited recursion
    const nodes = data.nodes.map((node) => ({
      ...node,
      height: calculateCollectionHeight(node.document || {})
    }));

    // Prepare edges
    const edges = data.edges || [];

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'center',
        d3.forceCenter(width / 2, height / 2)
      )
      .force(
        'link',
        d3
          .forceLink(edges)
          .id((d) => d.id)
          .distance(LINK_DISTANCE)
          .strength(0.2)
      )
      .force('charge', d3.forceManyBody().strength(-2000))
      .force(
        'collide',
        d3
          .forceCollide()
          .radius((d) => Math.max(400, d.height) / 2 + 40)
          .strength(1)
      );

    simulationRef.current = simulation;

    // Create edges
    const reference = g
      .selectAll('.reference')
      .data(edges)
      .join('g')
      .attr('class', (d) => {
        const s = typeof d.source === 'string' ? d.source : d.source.id;
        const t = typeof d.target === 'string' ? d.target : d.target.id;
        return `reference reference-${s}-${t}`;
      });

    reference
      .append('path')
      .attr('class', 'reference-path')
      .style('fill', 'none')
      .style('stroke', '#4299e1')
      .style('stroke-width', '2px')
      .style('stroke-dasharray', '5,5')
      .style('opacity', 0.6);

    reference
      .append('text')
      .attr('class', 'reference-label')
      .style('fill', '#4299e1')
      .style('font-size', '12px')
      .style('font-family', 'monospace')
      .text((d) => d.description || d.type);

    // Create node groups
    const collection = g
      .selectAll('.collection')
      .data(nodes)
      .join('g')
      .attr('class', (d) => `collection collection-${d.id}`)
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Add background
    collection
      .append('rect')
      .attr('class', 'collection-bg')
      .attr('x', -200) // half of 400
      .attr('y', (d) => -d.height / 2)
      .attr('width', 400)
      .attr('height', (d) => d.height)
      .attr('rx', 8)
      .style('fill', '#2a4365')
      .style('stroke', '#4299e1')
      .style('stroke-width', '2px');

    // Add header
    collection
      .append('rect')
      .attr('class', 'collection-header')
      .attr('x', -200)
      .attr('y', (d) => -d.height / 2)
      .attr('width', 400)
      .attr('height', 30)
      .attr('rx', 8)
      .style('fill', '#4299e1');

    // Add name text
    collection
      .append('text')
      .attr('class', 'collection-name')
      .attr('x', -200 + 20)
      .attr('y', (d) => -d.height / 2 + 20)
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .style('font-size', '14px')
      .text((d) => d.name);

    // Render the (simplified) document for each node
    collection.each(function (d) {
      const documentGroup = d3.select(this);
      if (d.document) {
        renderDocument(
          documentGroup,
          d.document,
          -200 + 20, // left + padding
          -d.height / 2 + 40, // top + some padding
          0
        );
      }
    });

    // On tick
    simulation.on('tick', () => {
      // Move edges
      reference.each(function (d) {
        const path = d3.select(this).select('.reference-path');
        const label = d3.select(this).select('.reference-label');

        if (!d.source || !d.target) return;

        const sourceX = d.source.x || 0;
        const sourceY = d.source.y || 0;
        const targetX = d.target.x || 0;
        const targetY = d.target.y || 0;

        const pathData = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
        path.attr('d', pathData);

        // Midpoint for label
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        label
          .attr('x', midX)
          .attr('y', midY - 10)
          .style('text-anchor', 'middle');
      });

      // Move collections
      collection.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Highlighting
    if (highlightedElements && highlightedElements.length > 0) {
      console.log('Applying highlights to DocumentVisualization:', highlightedElements);
      svg
        .selectAll('.collection-bg, .reference-path')
        .style('stroke', '#4299e1')
        .style('stroke-width', '2px')
        .style('opacity', 0.6);

      highlightedElements.forEach((id) => {
        const collectionElements = svg.selectAll(`.collection-${id} .collection-bg`);
        collectionElements
          .style('stroke', '#f56565')
          .style('stroke-width', '4px')
          .style('opacity', 1);

        const referenceElements = svg
          .selectAll(`.reference-${id}`)
          .selectAll('.reference-path');
        referenceElements
          .style('stroke', '#f56565')
          .style('stroke-width', '4px')
          .style('opacity', 1);

        // If no direct match, try data-based filtering
        if (collectionElements.size() === 0 && referenceElements.size() === 0) {
          const collectionsByData = g
            .selectAll('.collection')
            .filter((d) => d.id === id);
          if (collectionsByData.size() > 0) {
            collectionsByData
              .select('.collection-bg')
              .style('stroke', '#f56565')
              .style('stroke-width', '4px')
              .style('opacity', 1);
          }

          const referencesByData = g.selectAll('.reference').filter(function (d) {
            return (
              d.source === id ||
              d.target === id ||
              (d.source && d.source.id === id) ||
              (d.target && d.target.id === id)
            );
          });
          if (referencesByData.size() > 0) {
            referencesByData
              .select('.reference-path')
              .style('stroke', '#f56565')
              .style('stroke-width', '4px')
              .style('opacity', 1);
          }
        }
      });
    } else {
      console.log('No highlights to apply in DocumentVisualization');
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, highlightedElements, currentTime]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    />
  );
};

window.DocumentVisualization = DocumentVisualization;
export default DocumentVisualization;
