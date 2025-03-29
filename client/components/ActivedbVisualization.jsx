import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const ActiveDBVisualization = ({ data, onNodeClick }) => {
  const containerRef = useRef(null);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const timerRef = useRef(null);
  const nodePositionsRef = useRef({});

  useEffect(() => {
    if (
      !data ||
      !data.nodes ||
      !Array.isArray(data.nodes) ||
      data.nodes.length === 0 ||
      !data.edges ||
      !Array.isArray(data.edges)
    ) {
      console.error('Invalid data format for active database visualization');
      return;
    }

    // Clear any existing SVG and animations
    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const nodeWidth = 200;
    const nodeHeight = 140;
    const levelHeight = 180;

    // Create SVG with zoom support
    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Add a gradient definitions section
    const defs = svg.append('defs');
    
    // Create a gradient for traditional database
    const traditionalGradient = defs.append('linearGradient')
      .attr('id', 'traditionalGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    
    traditionalGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#8b5cf6'); // Purple
    
    traditionalGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#a78bfa'); // Light purple
    
    // Create a gradient for active database
    const activeGradient = defs.append('linearGradient')
      .attr('id', 'activeGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    
    activeGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#6366f1'); // Indigo
    
    activeGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#818cf8'); // Light indigo

    // Add a filter for drop shadow
    const filter = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('height', '130%');

    filter.append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 3)
      .attr('result', 'blur');

    filter.append('feOffset')
      .attr('in', 'blur')
      .attr('dx', 2)
      .attr('dy', 2)
      .attr('result', 'offsetBlur');

    const feMerge = filter.append('feMerge');

    feMerge.append('feMergeNode')
      .attr('in', 'offsetBlur');
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');

    // Add a glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('height', '130%');

    glowFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 2)
      .attr('result', 'blur');
    
    glowFilter.append('feComposite')
      .attr('in', 'blur')
      .attr('in2', 'SourceGraphic')
      .attr('operator', 'lighten');

    const zoom = d3.zoom()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Create a main container for zoomable content
    const g = svg.append('g');

    g.append('text')
      .attr('x', (3 * width) / 4)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .style('fill', '#818cf8') // Light indigo
      .style('font-weight', 'bold')
      .style('font-size', '22px')
      .text('Active Database');
    
    g.append('text')
      .attr('x', width / 4)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .style('fill', '#a78bfa')
      .style('font-weight', 'bold')
      .style('font-size', '22px')
      .text('Traditional Database');

    // Helper function to create hierarchy for a given root node id
    const createHierarchyForRoot = (rootId) => {
      const nodeMap = new Map(data.nodes.map(n => [n.id, { ...n, children: [] }]));
      // Recursively add children based on edges
      const addChildren = (parentId) => {
        const children = [];
        data.edges.forEach(edge => {
          if (edge.source === parentId) {
            const child = nodeMap.get(edge.target);
            if (child) {
              child.children = addChildren(child.id);
              children.push(child);
            }
          }
        });
        return children;
      };
      const rootNode = nodeMap.get(rootId);
      if (rootNode) {
        rootNode.children = addChildren(rootId);
      }
      return rootNode;
    };

    // Build hierarchies for the two trees:
    const manualRootData = createHierarchyForRoot("manual_db");
    const activeRootData = createHierarchyForRoot("active_db");

    if (!manualRootData || !activeRootData) {
      console.error("Root nodes for the trees were not found in the data.");
      return;
    }

    const manualHierarchy = d3.hierarchy(manualRootData);
    const activeHierarchy = d3.hierarchy(activeRootData);

    // Create separate tree layouts for each
    const treeLayout = d3.tree().nodeSize([nodeWidth + 60, levelHeight]);

    treeLayout(manualHierarchy);
    treeLayout(activeHierarchy);

    // Create separate groups for the two trees (left & right)
    const manualGroup = g.append('g')
      .attr('class', 'manual-group')
      // Position in the left quarter of the screen
      .attr('transform', `translate(${width / 4},80)`);

    const activeGroup = g.append('g')
      .attr('class', 'active-group')
      // Position in the right quarter of the screen
      .attr('transform', `translate(${(3 * width) / 4},80)`);

    // Create drag behavior for individual nodes
    const drag = d3.drag()
      .on('start', dragStarted)
      .on('drag', dragging)
      .on('end', dragEnded);

    function dragStarted(event, d) {
      // Store the original position if not already stored
      if (!nodePositionsRef.current[d.data.id]) {
        const transform = d3.select(this).attr('transform');
        const match = /translate\(([^,]+),([^)]+)\)/.exec(transform);
        if (match) {
          nodePositionsRef.current[d.data.id] = {
            x: parseFloat(match[1]),
            y: parseFloat(match[2])
          };
        }
      }
      
      // Bring the dragged node to the front
      d3.select(this).raise();
      
      // Add active class
      d3.select(this).classed('dragging', true);
      
      // Add a temporary strong glow to indicate dragging
      d3.select(this).selectAll('rect')
        .style('filter', 'url(#glow)')
        .style('stroke-width', '3px');
    }

    function dragging(event, d) {
      // Update node position during drag
      const currentTransform = d3.select(this).attr('transform');
      const match = /translate\(([^,]+),([^)]+)\)/.exec(currentTransform);
      if (match) {
        const currentX = parseFloat(match[1]);
        const currentY = parseFloat(match[2]);
        
        d3.select(this).attr('transform', `translate(${currentX + event.dx}, ${currentY + event.dy})`);
        
        // Update connected links for this node (both incoming and outgoing)
        const nodeId = d.data.id;
        const group = d3.select(this).node().parentNode === activeGroup.node() ? activeGroup : manualGroup;

        
        // Update source links (outgoing)
        group.selectAll('.link')
          .filter(linkData => linkData.source.data.id === nodeId)
          .each(function(linkData) {
            const target = linkData.target;
            const targetNode = group.select(`.node.${target.data.id}`);
            const targetTransform = targetNode.attr('transform');
            const targetMatch = /translate\(([^,]+),([^)]+)\)/.exec(targetTransform);
            
            if (targetMatch) {
              const sourceX = currentX + event.dx;
              const sourceY = currentY + event.dy;
              const targetX = parseFloat(targetMatch[1]);
              const targetY = parseFloat(targetMatch[2]);
              const midY = (sourceY + targetY) / 2;
              d3.select(this).attr('d', `M${sourceX},${sourceY} C${sourceX},${midY} ${targetX},${midY} ${targetX},${targetY}`);
            }
          });
        
        // Update target links (incoming)
        group.selectAll('.link')
          .filter(linkData => linkData.target.data.id === nodeId)
          .each(function(linkData) {
            const source = linkData.source;
            const sourceNode = group.select(`.node.${source.data.id}`);
            const sourceTransform = sourceNode.attr('transform');
            const sourceMatch = /translate\(([^,]+),([^)]+)\)/.exec(sourceTransform);
            
            if (sourceMatch) {
              const sourceX = parseFloat(sourceMatch[1]);
              const sourceY = parseFloat(sourceMatch[2]);
              const targetX = currentX + event.dx;
              const targetY = currentY + event.dy;
              const midY = (sourceY + targetY) / 2;
              d3.select(this).attr('d', `M${sourceX},${sourceY} C${sourceX},${midY} ${targetX},${midY} ${targetX},${targetY}`);
            }
          });
      }
    }

    function dragEnded(event, d) {
      // Remove dragging class and reset styles
      d3.select(this).classed('dragging', false);
      d3.select(this).selectAll('rect')
        .style('filter', 'url(#drop-shadow)')
        .style('stroke-width', '2px');
      
      // Animate back to original position
      const originalPos = nodePositionsRef.current[d.data.id];
      if (originalPos) {
        d3.select(this)
          .transition()
          .duration(800)
          .ease(d3.easeBounce)
          .attrTween('transform', function() {
            const ix = d3.interpolateNumber(
              +d3.select(this).attr('transform').match(/translate\(([^,]+),([^)]+)\)/)[1],
              originalPos.x
            );
            const iy = d3.interpolateNumber(
              +d3.select(this).attr('transform').match(/translate\(([^,]+),([^)]+)\)/)[2],
              originalPos.y
            );
            return function(t) {
              const newX = ix(t);
              const newY = iy(t);
              updateLinksForNode(d.data.id, newX, newY);
              return `translate(${newX},${newY})`;
            };
          });
      }
    }

    // Helper to update all links connected to a node (after drag end)
    function updateLinksForNode(nodeId, newX, newY) {
      // For both groups, update links where this node is source or target
      [manualGroup, activeGroup].forEach(group => {
        group.selectAll('.link')
          .each(function(linkData) {
            if (linkData.source.data.id === nodeId || linkData.target.data.id === nodeId) {
              const sourceNode = group.select(`.node.${linkData.source.data.id}`);
              const targetNode = group.select(`.node.${linkData.target.data.id}`);
              const sourceTransform = sourceNode.attr('transform');
              const targetTransform = targetNode.attr('transform');
              const sourceMatch = /translate\(([^,]+),([^)]+)\)/.exec(sourceTransform);
              const targetMatch = /translate\(([^,]+),([^)]+)\)/.exec(targetTransform);
              if (sourceMatch && targetMatch) {
                const sourceX = parseFloat(sourceMatch[1]);
                const sourceY = parseFloat(sourceMatch[2]);
                const targetX = parseFloat(targetMatch[1]);
                const targetY = parseFloat(targetMatch[2]);
                const midY = (sourceY + targetY) / 2;
                d3.select(this).attr('d', `M${sourceX},${sourceY} C${sourceX},${midY} ${targetX},${midY} ${targetX},${targetY}`);
              }
            }
          });
      });
    }

    // Function to draw a tree inside a given group
    const drawTree = (group, rootData, isActive) => {
      // Create curved links with dashed lines
      const link = group.selectAll('.link')
        .data(rootData.links())
        .join('path')
        .attr('class', d => `link source-${d.source.data.id} target-${d.target.data.id}`)
        .attr('d', d => {
          const midY = (d.source.y + d.target.y) / 2;
          return `M${d.source.x},${d.source.y}
                  C${d.source.x},${midY}
                  ${d.target.x},${midY}
                  ${d.target.x},${d.target.y}`;
        })
        .style('fill', 'none')
        .style('stroke', isActive ? '#818cf8' : '#a78bfa')
        .style('stroke-width', '2px')
        .style('stroke-opacity', 0.8)
        .style('stroke-dasharray', 'none');

      // Create node containers
      const node = group.selectAll('.node')
        .data(rootData.descendants())
        .join('g')
        .attr('class', d => `node ${d.data.id}`)
        .attr('transform', d => {
          // Store the initial position in the reference object
          nodePositionsRef.current[d.data.id] = { x: d.x, y: d.y };
          return `translate(${d.x},${d.y})`;
        })
        .on('click', (event, d) => onNodeClick && onNodeClick(d.data))
        .call(drag); // Apply drag behavior to each node

      // Add node backgrounds with rounded corners
      node.append('rect')
        .attr('x', -nodeWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', 10)
        .attr('ry', 10)
        .style('fill', '#1e1e2e')
        .style('stroke', d => {
          if (isActive) {
            switch (d.data.type) {
              case 'root': return '#6366f1';
              case 'branch': return '#818cf8';
              default: return '#a5b4fc';
            }
          } else {
            switch (d.data.type) {
              case 'root': return '#8b5cf6';
              case 'branch': return '#a78bfa';
              default: return '#c4b5fd';
            }
          }
        })
        .style('stroke-width', '2px')
        .style('filter', 'url(#drop-shadow)')
        .style('cursor', 'pointer');

      // Add node header rectangle
      node.append('rect')
        .attr('x', -nodeWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('width', nodeWidth)
        .attr('height', 30)
        .attr('rx', 10)
        .attr('ry', 10)
        .style('fill', d => {
          if (isActive) {
            switch (d.data.type) {
              case 'root': return '#4f46e5';
              case 'branch': return '#6366f1';
              default: return '#818cf8';
            }
          } else {
            switch (d.data.type) {
              case 'root': return '#7c3aed';
              case 'branch': return '#8b5cf6';
              default: return '#a78bfa';
            }
          }
        })
        .style('cursor', 'pointer');

      // Add node titles
      node.append('text')
        .attr('x', 0)
        .attr('y', -nodeHeight / 2 + 20)
        .attr('text-anchor', 'middle')
        .style('fill', 'white')
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .text(d => d.data.name);

      // Add node properties
      node.each(function(d) {
        const properties = d.data.properties || [];
        const nodeGroup = d3.select(this);
        properties.forEach((prop, i) => {
          nodeGroup.append('text')
            .attr('x', -nodeWidth / 2 + 10)
            .attr('y', -nodeHeight / 2 + 50 + i * 20)
            .style('fill', '#e2e8f0')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .text(prop);
        });
      });

      // Add icons for each node type
      node.each(function(d) {
        const nodeGroup = d3.select(this);
        if (d.data.type === 'root') {
          const db = nodeGroup.append('g')
            .attr('transform', 'translate(70, 30)');
          db.append('ellipse')
            .attr('cx', 0)
            .attr('cy', -8)
            .attr('rx', 15)
            .attr('ry', 5)
            .attr('fill', isActive ? '#a5b4fc' : '#c4b5fd')
            .attr('opacity', 0.9);
          db.append('rect')
            .attr('x', -15)
            .attr('y', -8)
            .attr('width', 30)
            .attr('height', 25)
            .attr('fill', isActive ? '#a5b4fc' : '#c4b5fd')
            .attr('opacity', 0.7);
          db.append('ellipse')
            .attr('cx', 0)
            .attr('cy', 17)
            .attr('rx', 15)
            .attr('ry', 5)
            .attr('fill', isActive ? '#a5b4fc' : '#c4b5fd')
            .attr('opacity', 0.9);
          db.append('line')
            .attr('x1', -15)
            .attr('y1', -8)
            .attr('x2', -15)
            .attr('y2', 17)
            .attr('stroke', isActive ? '#a5b4fc' : '#c4b5fd')
            .attr('opacity', 0.9);
          db.append('line')
            .attr('x1', 15)
            .attr('y1', -8)
            .attr('x2', 15)
            .attr('y2', 17)
            .attr('stroke', isActive ? '#a5b4fc' : '#c4b5fd')
            .attr('opacity', 0.9);
        } else if (d.data.type === 'branch') {
          if (isActive) {
            const gear = nodeGroup.append('g')
              .attr('transform', 'translate(70, 30)')
              .attr('class', 'gear');
            gear.append('circle')
              .attr('cx', 0)
              .attr('cy', 0)
              .attr('r', 15)
              .attr('fill', '#a5b4fc')
              .attr('opacity', 0.8);
            const teeth = 8;
            const toothSize = 5;
            const teethPoints = [];
            for (let i = 0; i < teeth; i++) {
              const angle = (i / teeth) * 2 * Math.PI;
              const x1 = Math.cos(angle) * 15;
              const y1 = Math.sin(angle) * 15;
              const x2 = Math.cos(angle) * (15 + toothSize);
              const y2 = Math.sin(angle) * (15 + toothSize);
              const nextAngle = ((i + 0.5) / teeth) * 2 * Math.PI;
              const x3 = Math.cos(nextAngle) * (15 + toothSize);
              const y3 = Math.sin(nextAngle) * (15 + toothSize);
              const x4 = Math.cos(nextAngle) * 15;
              const y4 = Math.sin(nextAngle) * 15;
              teethPoints.push(`M${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4}`);
            }
            gear.selectAll('.tooth')
              .data(teethPoints)
              .enter()
              .append('path')
              .attr('d', d => d)
              .attr('fill', '#a5b4fc')
              .attr('opacity', 0.9);
            gear.append('circle')
              .attr('cx', 0)
              .attr('cy', 0)
              .attr('r', 5)
              .attr('fill', '#a5b4fc')
              .attr('opacity', 1);
          } else {
            const user = nodeGroup.append('g')
              .attr('transform', 'translate(70, 30)');
            user.append('circle')
              .attr('cx', 0)
              .attr('cy', -7)
              .attr('r', 8)
              .attr('fill', '#c4b5fd')
              .attr('opacity', 0.9);
            user.append('path')
              .attr('d', 'M-12,17 C-12,5 12,5 12,17')
              .attr('fill', '#c4b5fd')
              .attr('opacity', 0.9);
          }
        } else if (d.data.type === 'leaf') {
          if (isActive) {
            const dataIcon = nodeGroup.append('g')
              .attr('transform', 'translate(70, 30)');
            dataIcon.append('rect')
              .attr('x', -12)
              .attr('y', -15)
              .attr('width', 24)
              .attr('height', 30)
              .attr('rx', 2)
              .attr('ry', 2)
              .attr('fill', '#a5b4fc')
              .attr('opacity', 0.8);
            for (let i = 0; i < 4; i++) {
              dataIcon.append('line')
                .attr('x1', -8)
                .attr('y1', -10 + i * 8)
                .attr('x2', 8)
                .attr('y2', -10 + i * 8)
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 2)
                .attr('opacity', 0.9);
            }
            dataIcon.append('path')
              .attr('d', 'M10,0 L16,5 L10,10 Z')
              .attr('fill', '#ffffff')
              .attr('opacity', 1)
              .attr('class', 'update-arrow');
          } else {
            const docIcon = nodeGroup.append('g')
              .attr('transform', 'translate(70, 30)');
            docIcon.append('path')
              .attr('d', 'M-10,-15 L5,-15 L10,-10 L10,15 L-10,15 Z')
              .attr('fill', '#c4b5fd')
              .attr('opacity', 0.8);
            docIcon.append('path')
              .attr('d', 'M5,-15 L5,-10 L10,-10')
              .attr('fill', 'none')
              .attr('stroke', '#ffffff')
              .attr('opacity', 0.9);
            docIcon.append('path')
              .attr('d', 'M12,0 C15,-2 15,10 12,8 C17,8 17,12 12,12')
              .attr('fill', 'none')
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 1.5)
              .attr('opacity', 1)
              .attr('class', 'hand-icon');
          }
        }
      });
    };

    // Draw the manual (Traditional DB) tree on the left
    drawTree(manualGroup, manualHierarchy, false);
    // Draw the active (Active DB) tree on the right
    drawTree(activeGroup, activeHierarchy, true);

    // Add data flow visual elements for animation
    const manualLinks = manualGroup.selectAll('.link').nodes();
    manualLinks.forEach(link => {
      manualGroup.append('circle')
        .attr('class', 'data-packet manual')
        .attr('r', 5)
        .attr('fill', '#a78bfa') // Light purple
        .style('filter', 'url(#glow)')
        .style('opacity', 0);
    });
    const activeLinks = activeGroup.selectAll('.link').nodes();
    activeLinks.forEach(link => {
      activeGroup.append('circle')
        .attr('class', 'data-packet active')
        .attr('r', 5)
        .attr('fill', '#818cf8') // Light indigo
        .style('filter', 'url(#glow)')
        .style('opacity', 0);
    });

    // Center the overall visualization
    const allBounds = g.node().getBBox();
    const scale = Math.min(
      width / allBounds.width,
      height / allBounds.height
    ) * 0.9;
    const transform = d3.zoomIdentity
      .translate(
        width / 2 - (allBounds.x + allBounds.width / 2) * scale,
        height / 2 - (allBounds.y + allBounds.height / 2) * scale
      )
      .scale(scale);
    svg.call(zoom.transform, transform);

    // Animation functions
    const animateTraditionalFlow = () => {
      if (!animationEnabled) return;
      
      const userNode = manualGroup.select('.node.user_manual');
      const userIcon = userNode.select('.hand-icon');
      
      if (userIcon.size() > 0) {
        userIcon
          .transition()
          .duration(500)
          .attr('transform', 'translate(2, 2)')
          .transition()
          .duration(500)
          .attr('transform', 'translate(0, 0)')
          .on('end', () => {
            const linkIndex = Math.floor(Math.random() * manualLinks.length);
            const linkPathElement = manualLinks[linkIndex];
            
            const packet = manualGroup
              .append('circle')
              .attr('r', 5)
              .attr('fill', '#c4b5fd') // Lighter purple
              .style('filter', 'url(#glow)');
            
            const pathLength = linkPathElement.getTotalLength();
            
            packet
              .transition()
              .duration(3000) // Slow movement
              .attrTween('transform', () => {
                return (t) => {
                  const point = linkPathElement.getPointAtLength(t * pathLength);
                  return `translate(${point.x}, ${point.y})`;
                };
              })
              .on('end', function() {
                d3.select(this).remove();
                const updateNode = manualGroup.select('.node.update_manual');
                const handIcon = updateNode.select('.hand-icon');
                if (handIcon.size() > 0) {
                  handIcon
                    .transition()
                    .duration(800)
                    .attr('transform', 'translate(2, 2)')
                    .transition()
                    .duration(800)
                    .attr('transform', 'translate(0, 0)');
                }
              });
          });
      }
    };
    
    const animateActiveFlow = () => {
      if (!animationEnabled) return;
      
      const triggerNode = activeGroup.select('.node.trigger_auto');
      const gearIcon = triggerNode.select('.gear');
      
      if (gearIcon.size() > 0) {
        gearIcon
          .transition()
          .duration(1000)
          .attrTween('transform', () => {
            return (t) => `translate(70, 30) rotate(${t * 360})`;
          })
          .on('end', () => {
            const linkIndex = Math.floor(Math.random() * activeLinks.length);
            const linkPathElement = activeLinks[linkIndex];
            
            const packet = activeGroup
              .append('circle')
              .attr('r', 5)
              .attr('fill', '#a5b4fc') // Lighter indigo
              .style('filter', 'url(#glow)');
            
            const pathLength = linkPathElement.getTotalLength();
            
            packet
              .transition()
              .duration(1000) // Fast movement
              .attrTween('transform', () => {
                return (t) => {
                  const point = linkPathElement.getPointAtLength(t * pathLength);
                  return `translate(${point.x}, ${point.y})`;
                };
              })
              .on('end', function() {
                d3.select(this).remove();
                const updateNode = activeGroup.select('.node.update_auto');
                const updateArrow = updateNode.select('.update-arrow');
                if (updateArrow.size() > 0) {
                  updateArrow
                    .transition()
                    .duration(500)
                    .attr('transform', 'translate(2, 0)')
                    .transition()
                    .duration(500)
                    .attr('transform', 'translate(0, 0)');
                }
              });
          });
      }
    };

    // Start animations alternating between the two sides
    const runAnimations = () => {
      if (!animationEnabled) return;
      setTimeout(animateTraditionalFlow, 1000);
      setTimeout(animateActiveFlow, 3000);
    };

    runAnimations();
    timerRef.current = setInterval(runAnimations, 8000);

    // Highlight functions (if needed) can be added here

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [data, onNodeClick, animationEnabled]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: 500,
        backgroundColor: '#1a1b26',
        borderRadius: '10px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        position: 'relative'
      }}
    />
  );
};

export default ActiveDBVisualization;
