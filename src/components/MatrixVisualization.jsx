import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const MatrixVisualization = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    
    // Clear any previous visualization
    d3.select(containerRef.current).selectAll('*').remove();
    
    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    
    // Create SVG
    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#fff');
    
    // Create main groups for each matrix
    const bcgGroup = svg.append('g')
      .attr('class', 'bcg')
      .attr('transform', `translate(0,0)`);
    
    const geGroup = svg.append('g')
      .attr('class', 'ge')
      .attr('transform', `translate(${width/2},0)`);
    
    // Create a lookup for nodes by id
    const nodeById = {};
    data.nodes.forEach(d => { nodeById[d.id] = d; });
    
    // --- BCG Matrix Layout (left half) ---
    const bcgWidth = width / 2;
    const bcgHeight = height;
    const bcgMargin = 60;
    
    // Add BCG Matrix title
    bcgGroup.append('text')
      .attr('x', bcgWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('BOSTON CONSULTING GROUP MATRIX');
    
    // Add axis labels for BCG
    bcgGroup.append('text')
      .attr('x', bcgWidth / 2)
      .attr('y', bcgHeight - 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('RELATIVE MARKET SHARE');
    
    bcgGroup.append('text')
      .attr('x', -bcgHeight / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .attr('transform', 'rotate(-90)')
      .text('MARKET GROWTH');
    
    // Add BCG grid
    const bcgGridWidth = bcgWidth - 2 * bcgMargin;
    const bcgGridHeight = bcgHeight - 2 * bcgMargin - 40;
    
    // Draw grid background
    const bcgColors = {
      'Stars': '#4CAF50',        // Green for Stars
      'Question Marks': '#9C27B0', // Purple for Question Marks
      'Cash Cows': '#E91E63',    // Pink for Cash Cows
      'Dogs': '#FF5722'          // Orange for Dogs
    };
    
    // BCG cells in a 2x2 grid
    const bcgCells = data.nodes.filter(d => d.id.startsWith('bcg_') && d.type === 'strategy_type');
    
    // Create grid cells with backgrounds
    bcgCells.forEach((cell, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const cellX = bcgMargin + (1 - col) * (bcgGridWidth / 2); // Reverse column order
      const cellY = bcgMargin + 40 + row * (bcgGridHeight / 2);
      const cellWidth = bcgGridWidth / 2;
      const cellHeight = bcgGridHeight / 2;
      
      // Add background rectangle
      bcgGroup.append('rect')
        .attr('x', cellX)
        .attr('y', cellY)
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('fill', bcgColors[cell.name])
        .attr('fill-opacity', 0.2)
        .attr('stroke', '#333')
        .attr('stroke-width', 1);
      
      // Store position for node placement
      cell.x = cellX + cellWidth / 2;
      cell.y = cellY + cellHeight / 2;
    });
    
    // Position the BCG center node
    const bcgCenter = data.nodes.find(d => d.id === 'bcg_center');
    if (bcgCenter) {
      bcgCenter.x = bcgWidth / 2;
      bcgCenter.y = bcgHeight / 2;
    }
    
    // --- GE-McKinsey Matrix Layout (right half) ---
    const geWidth = width / 2;
    const geHeight = height;
    const geMargin = 60;
    
    // Add GE Matrix title
    geGroup.append('text')
      .attr('x', geWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('GE-MCKINSEY MATRIX');
    
    // Add axis labels for GE
    geGroup.append('text')
      .attr('x', geWidth / 2)
      .attr('y', geHeight - 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('BUSINESS UNIT STRENGTH');
    
    geGroup.append('text')
      .attr('x', -geHeight / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .attr('transform', 'rotate(-90)')
      .text('INDUSTRY ATTRACTIVENESS');
    
    // GE cells in a 3x3 grid
    const geCells = data.nodes.filter(d => d.id.startsWith('ge_cell') && d.type === 'strategy_type');
    const geGridWidth = geWidth - 2 * geMargin;
    const geGridHeight = geHeight - 2 * geMargin - 40;
    
    // Define colors for GE matrix cells based on position
    const geColorScale = d3.scaleLinear()
      .domain([0, 2, 4, 6, 8])
      .range(['#1B5E20', '#4CAF50', '#FFA000', '#E65100', '#B71C1C']);
    
    // Create grid cells with backgrounds
    geCells.forEach((cell, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cellX = geMargin + col * (geGridWidth / 3);
      const cellY = geMargin + 40 + (2 - row) * (geGridHeight / 3); // Reverse row order
      const cellWidth = geGridWidth / 3;
      const cellHeight = geGridHeight / 3;
      
      // Add background rectangle with color based on position
      const colorIndex = (2 - row) * 3 + col;
      
      geGroup.append('rect')
        .attr('x', cellX)
        .attr('y', cellY)
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('fill', geColorScale(colorIndex))
        .attr('fill-opacity', 0.3)
        .attr('stroke', '#333')
        .attr('stroke-width', 1);
      
      // Store position for node placement
      cell.x = cellX + cellWidth / 2;
      cell.y = cellY + cellHeight / 2;
    });
    
    // Position the GE center node
    const geCenter = data.nodes.find(d => d.id === 'ge_center');
    if (geCenter) {
      geCenter.x = geWidth / 2;
      geCenter.y = geHeight / 2;
    }
    
    // --- Draw node elements ---
    const drawNode = (group, d) => {
      // Create a group for the node that will be draggable
      const nodeGroup = group.append('g')
        .attr('class', 'node')
        .attr('transform', `translate(${d.x},${d.y})`)
        // Make sure the entire group shows a "move" cursor and is draggable
        .style('cursor', 'move')
        .call(d3.drag()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded));
      
      if (d.type === 'strategy') {
        // Central node as a rectangle
        nodeGroup.append('rect')
          .attr('width', 100)
          .attr('height', 40)
          .attr('x', -50)
          .attr('y', -20)
          .attr('fill', '#f8cecc')
          .attr('stroke', '#b85450')
          .attr('stroke-width', 2)
          .attr('rx', 5)
          .attr('ry', 5);
          
        nodeGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', 5)
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'sans-serif')
          .attr('fill', '#2a4056')
          .text(d.name);
      } else if (d.type === 'strategy_type') {
        if (d.id.startsWith('bcg_')) {
          // For BCG, use appropriate icons based on quadrant
          if (d.name === 'Stars') {
            // Star icon
            nodeGroup.append('path')
              .attr('d', 'M0,-15L3,-5L14,-5L5,2L8,12L0,6L-8,12L-5,2L-14,-5L-3,-5Z')
              .attr('fill', '#FFD700')  // Gold color for star
              .attr('stroke', '#333')
              .attr('stroke-width', 1);
            
            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', 25)
              .attr('font-size', '12px')
              .attr('font-weight', 'bold')
              .attr('font-family', 'sans-serif')
              .attr('fill', '#333')
              .text(d.name);
          } else if (d.name === 'Question Marks') {
            // Question mark icon
            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', 5)
              .attr('font-size', '24px')
              .attr('font-weight', 'bold')
              .attr('font-family', 'sans-serif')
              .attr('fill', '#9C27B0')  // Purple color
              .text('?');
              
            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', 25)
              .attr('font-size', '12px')
              .attr('font-weight', 'bold')
              .attr('font-family', 'sans-serif')
              .attr('fill', '#333')
              .text(d.name);
          } else if (d.name === 'Cash Cows') {
            // Cash cow icon
            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', 5)
              .attr('font-size', '24px')
              .attr('font-weight', 'bold')
              .attr('font-family', 'sans-serif')
              .attr('fill', '#E91E63')  // Pink color
              .text('$');
              
            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', 25)
              .attr('font-size', '12px')
              .attr('font-weight', 'bold')
              .attr('font-family', 'sans-serif')
              .attr('fill', '#333')
              .text(d.name);
          } else if (d.name === 'Dogs') {
            // Dog icon
            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', 5)
              .attr('font-size', '24px')
              .attr('font-weight', 'bold')
              .attr('font-family', 'sans-serif')
              .attr('fill', '#FF5722')  // Orange color
              .text('D');
              
            nodeGroup.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', 25)
              .attr('font-size', '12px')
              .attr('font-weight', 'bold')
              .attr('font-family', 'sans-serif')
              .attr('fill', '#333')
              .text(d.name);
          }
        } else {
          // --- FIXED GE LABELS & ICONS ---
          // For GE cells, label them according to the Grow/Hold/Harvest scheme
          const cellIndex = parseInt(d.id.replace('ge_cell', ''));
          let icon = '';
          let iconColor = '#000';
          let cellName = '';

          if ([4,7,8].includes(cellIndex)) {
            icon = '🌸';           // Flower icon
            iconColor = '#4CAF50'; // Green
            cellName = 'Grow/Invest';
          }
          else if ([1,5,9].includes(cellIndex)) {
            icon = '✋';             // Hand icon
            iconColor = '#FFA000';   // Amber
            cellName = 'Hold/Protect';
          }
          else {
            iconColor = '#B71C1C';   // Red
            cellName = 'Harvest/Divest';
            if (cellIndex === 3) {
              icon = '💰';          // Money bag
            } else {
              icon = '🍎';          // Apple
            }
          }
          
          // Draw a circle background behind the icon
          nodeGroup.append('circle')
            .attr('r', 15)
            .attr('fill', 'white')
            .attr('stroke', '#333')
            .attr('stroke-width', 1);
            
          // Icon text
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 5)
            .attr('font-size', '16px')
            .attr('font-family', 'sans-serif')
            .attr('fill', iconColor)
            .text(icon);
            
          // Strategy label
          nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 25)
            .attr('font-size', '9px')
            .attr('font-family', 'sans-serif')
            .attr('fill', '#333')
            .text(cellName);
        }
      }
    };
    
    // Draw edges connecting nodes
    data.edges.forEach(edge => {
      const source = nodeById[edge.source];
      const target = nodeById[edge.target];
      if (source && target) {
        let group = source.id.startsWith('bcg') ? bcgGroup : geGroup;
        group.append('line')
          .attr('x1', source.x)
          .attr('y1', source.y)
          .attr('x2', target.x)
          .attr('y2', target.y)
          .attr('stroke', '#ccc')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4')
          .attr('class', `edge-${source.id}-${target.id}`);
      }
    });
    
    // Filter out target nodes to remove them from drawing
    const nonTargetNodes = data.nodes.filter(d => d.type !== 'target');
    
    // Draw BCG nodes (excluding target nodes)
    nonTargetNodes.filter(d => d.id.startsWith('bcg')).forEach(d => {
      drawNode(bcgGroup, d);
    });
    
    // Draw GE nodes (excluding target nodes)
    nonTargetNodes.filter(d => d.id.startsWith('ge')).forEach(d => {
      drawNode(geGroup, d);
    });
    
    // Drag functions
    function dragStarted(event, d) {
      d3.select(this).raise().attr('stroke', 'black').attr('stroke-width', 2);
    }
    
    function dragged(event, d) {
      d.x = event.x;
      d.y = event.y;
      d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
      
      // Update connected edges
      data.edges.forEach(edge => {
        if (edge.source === d.id || edge.target === d.id) {
          const source = nodeById[edge.source];
          const target = nodeById[edge.target];
          const group = source.id.startsWith('bcg') ? bcgGroup : geGroup;
          
          group.select(`.edge-${edge.source}-${edge.target}`)
            .attr('x1', source.x)
            .attr('y1', source.y)
            .attr('x2', target.x)
            .attr('y2', target.y);
        }
      });
    }
    
    function dragEnded(event, d) {
      d3.select(this).attr('stroke', null).attr('stroke-width', null);
    }
    
  }, [data]);
  
  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
};

export default MatrixVisualization;
