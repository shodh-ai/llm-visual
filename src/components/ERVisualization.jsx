import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ERVisualization = ({ data, highlightedElements, currentTime }) => {
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    const simulationRef = useRef(null);
    
    // Initial render of the visualization
    useEffect(() => {
        // Validate input data
        if (!containerRef.current || !data || !data.nodes || !Array.isArray(data.nodes) || 
            data.nodes.length === 0 || !data.edges || !Array.isArray(data.edges)) {
            console.error('Invalid data format for ER visualization');
            return;
        }

        // Constants
        const entityWidth = 200;
        const relationshipSize = 120;
        const rowHeight = 25;

        // Get container dimensions
        const container = d3.select(containerRef.current);
        const width = container.node().clientWidth;
        const height = container.node().clientHeight;

        // Clear any existing SVG
        container.selectAll('*').remove();

        // Create SVG with zoom support
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background-color', '#1a202c');
            
        svgRef.current = svg;

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 2])
            .on('zoom', (event) => g.attr('transform', event.transform));

        svg.call(zoom);

        // Create a container for the zoomable content
        const g = svg.append('g')
            .attr('transform', `translate(${width/2},${height/2})`);

        // Calculate node heights
        const nodes = data.nodes.map(node => ({
            ...node,
            height: ((node.attributes ? node.attributes.length : 0) + 1) * rowHeight
        }));

        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(data.edges)
                .id(d => d.id)
                .distance(300)
                .strength(0.2))
            .force('charge', d3.forceManyBody()
                .strength(-2000))
            .force('collide', d3.forceCollide()
                .radius(d => d.type === 'relationship' ? relationshipSize/2 : entityWidth/2)
                .strength(1))
            .force('x', d3.forceX(0).strength(0.1))
            .force('y', d3.forceY(0).strength(0.1));
            
        simulationRef.current = simulation;

        // Create relationship lines
        const relationship = g.selectAll('.relationship-line')
            .data(data.edges)
            .join('g')
            .attr('class', d => `relationship-line relationship-${d.source}-${d.target}`);

        // Add path for each relationship
        relationship.append('path')
            .attr('class', 'relationship-path')
            .style('fill', 'none')
            .style('stroke', '#4299e1')
            .style('stroke-width', '2px');

        // Create nodes (entities and relationships)
        const node = g.selectAll('.node')
            .data(nodes)
            .join('g')
            .attr('class', d => `node node-${d.id}`)
            .call(d3.drag()
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
                }));

        // Add shapes based on node type
        node.each(function(d) {
            const nodeGroup = d3.select(this);
            
            if (d.type === 'entity') {
                // Rectangle for entities
                nodeGroup.append('rect')
                    .attr('x', -entityWidth/2)
                    .attr('y', d => -d.height/2)
                    .attr('width', entityWidth)
                    .attr('height', d => d.height)
                    .attr('rx', 5)
                    .style('fill', '#2c5282')
                    .style('stroke', '#4299e1')
                    .style('stroke-width', '2px');
            } else if (d.type === 'relationship') {
                // Diamond for relationships
                const points = [
                    [0, -relationshipSize/2],
                    [relationshipSize/2, 0],
                    [0, relationshipSize/2],
                    [-relationshipSize/2, 0]
                ].map(point => point.join(',')).join(' ');
                
                nodeGroup.append('polygon')
                    .attr('points', points)
                    .style('fill', '#2a4365')
                    .style('stroke', '#4299e1')
                    .style('stroke-width', '2px');
            } else {
                // Circle for other types
                nodeGroup.append('circle')
                    .attr('r', 50)
                    .style('fill', '#2a4365')
                    .style('stroke', '#4299e1')
                    .style('stroke-width', '2px');
            }

            // Add node name
            nodeGroup.append('text')
                .attr('class', 'node-name')
                .attr('y', d.type === 'relationship' ? 0 : -d.height/2 + rowHeight/2 + 5)
                .style('fill', 'white')
                .style('font-weight', 'bold')
                .style('font-size', '14px')
                .style('text-anchor', 'middle')
                .style('dominant-baseline', 'middle')
                .text(d.name);

            // Add attributes for entities
            if (d.type === 'entity' && d.attributes) {
                d.attributes.forEach((attr, i) => {
                    const y = -d.height/2 + (i + 1) * rowHeight + rowHeight/2;
                    
                    // Key attribute indicator
                    if (attr.isKey) {
                        nodeGroup.append('text')
                            .attr('x', -entityWidth/2 + 10)
                            .attr('y', y + 5)
                            .style('fill', '#ffd700')
                            .style('font-size', '12px')
                            .text('🔑');
                    }
                    
                    // Attribute name
                    nodeGroup.append('text')
                        .attr('x', -entityWidth/2 + (attr.isKey ? 25 : 10))
                        .attr('y', y + 5)
                        .style('fill', 'white')
                        .style('font-size', '12px')
                        .text(attr.name);
                });
            }
        });

        // Update force simulation on tick
        simulation.on('tick', () => {
            // Update relationship lines
            relationship.each(function(d) {
                const path = d3.select(this).select('.relationship-path');
                
                if (!d.source || !d.target) return;
                
                const sourceX = d.source.x || 0;
                const sourceY = d.source.y || 0;
                const targetX = d.target.x || 0;
                const targetY = d.target.y || 0;
                
                // Calculate the angle of the line
                const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
                
                // Calculate points for the relationship line
                const pathData = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
                
                path.attr('d', pathData);
            });

            // Update node positions
            node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
        });

        // Initial positioning - run simulation for a bit then stop
        simulation.alpha(1).restart();
        setTimeout(() => {
            simulation.stop();
        }, 2000);

        // Cleanup function
        return () => {
            if (simulationRef.current) {
                simulationRef.current.stop();
            }
        };
    }, [data]);

    // Handle highlighting separately
    useEffect(() => {
        console.log('HIGHLIGHT DEBUG: ERVisualization received highlightedElements:', highlightedElements);
        
        if (!svgRef.current || !highlightedElements) return;
        
        const svg = svgRef.current;
        console.log('ERVisualization: Applying highlights:', highlightedElements);
        
        // Reset all highlights first
        svg.selectAll('.node')
            .classed('highlighted', false)
            .selectAll('rect, polygon, circle')
            .style('stroke', '#4299e1')
            .style('stroke-width', '2px');
        
        // Apply highlights
        if (highlightedElements && highlightedElements.length > 0) {
            highlightedElements.forEach(id => {
                console.log('ERVisualization: Highlighting node with ID:', id);
                const nodeElements = svg.selectAll(`.node-${id}`);
                
                nodeElements
                    .classed('highlighted', true)
                    .selectAll('rect, polygon, circle')
                    .style('stroke', '#f56565')
                    .style('stroke-width', '4px');
                
                console.log(`ERVisualization: Found ${nodeElements.size()} elements for ID: ${id}`);
            });
        } else {
            console.log('ERVisualization: No highlights to apply');
        }
    }, [highlightedElements]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && svgRef.current) {
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;
                
                svgRef.current
                    .attr('width', width)
                    .attr('height', height);
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div 
            ref={containerRef} 
            style={{ width: "100%", height: "100%", minHeight: "500px" }} 
        />
    );
};

// Assign to global variable so it's accessible
window.ERVisualization = ERVisualization;

export default ERVisualization;