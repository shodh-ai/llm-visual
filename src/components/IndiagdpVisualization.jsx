import React, { useEffect, useRef, forwardRef } from 'react';
import * as d3 from 'd3';

// Using forwardRef to properly handle refs
const IndiaGDPVisualization = forwardRef(({ data, highlightedElements, currentTime }, ref) => {
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    
    // Initial render of the visualization
    useEffect(() => {
        // Check if data exists and has the correct structure
        if (!containerRef.current || !data) {
            console.error('Invalid or missing data format for GDP visualization');
            return;
        }

        // Extract GDP data safely
        const gdpData = data.nodes?.[0]?.data || [
            // Fallback data if the expected structure isn't found
            {"year": 2000, "growth": 3.8},
            {"year": 2001, "growth": 4.8},
            {"year": 2002, "growth": 3.8},
            {"year": 2003, "growth": 7.9},
            {"year": 2004, "growth": 7.9},
            {"year": 2005, "growth": 8.1},
            {"year": 2006, "growth": 7.7},
            {"year": 2007, "growth": 3.1},
            {"year": 2008, "growth": 7.9},
            {"year": 2009, "growth": 8.5},
            {"year": 2010, "growth": 5.2},
            {"year": 2011, "growth": 5.5},
            {"year": 2012, "growth": 6.4},
            {"year": 2013, "growth": 7.4},
            {"year": 2014, "growth": 8.0},
            {"year": 2015, "growth": 8.3},
            {"year": 2016, "growth": 6.8},
            {"year": 2017, "growth": 6.5},
            {"year": 2018, "growth": 3.7},
            {"year": 2019, "growth": 4.0},
            {"year": 2020, "growth": -5.8},
            {"year": 2021, "growth": 9.7},
            {"year": 2022, "growth": 7.0},
            {"year": 2023, "growth": 8.2}
        ];

        // Get container dimensions
        const container = d3.select(containerRef.current);
        const width = container.node().clientWidth;
        const height = container.node().clientHeight;
        const margin = { top: 50, right: 50, bottom: 80, left: 80 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Clear any existing SVG
        container.selectAll('*').remove();

        // Create SVG with zoom support
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background-color', '#f8f0fa');
            
        svgRef.current = svg;

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => g.attr('transform', event.transform));

        svg.call(zoom);

        // Create a container for the zoomable content
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([
                d3.min(gdpData, d => d.year) || 2000, 
                d3.max(gdpData, d => d.year) || 2023
            ])
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([
                (d3.min(gdpData, d => d.growth) || -6) - 1, 
                (d3.max(gdpData, d => d.growth) || 10) + 1
            ])
            .range([innerHeight, 0]);

        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => d.toString())
            .ticks(Math.min(gdpData.length, 12))
            .tickSizeOuter(0);

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => `${d}%`)
            .tickSizeOuter(0);

        // Add axes to the visualization
        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'middle')
            .style('font-size', '16px')
            .attr('dy', '1em');

        g.append('g')
            .attr('class', 'y-axis')
            .style('font-size', '16px')
            .call(yAxis);

        // Add grid lines
        g.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis
                .tickSize(-innerHeight)
                .tickFormat('')
            )
            .style('stroke-dasharray', '3,3')
            .style('stroke-opacity', 0.2);

        g.append('g')
            .attr('class', 'grid')
            .call(yAxis
                .tickSize(-innerWidth)
                .tickFormat('')
            )
            .style('stroke-dasharray', '3,3')
            .style('stroke-opacity', 0.2);

        // Create line generator
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.growth))
            .curve(d3.curveMonotoneX);

        // Add the line path
        g.append('path')
            .datum(gdpData)
            .attr('class', 'line-path')
            .attr('id', 'line-path')
            .attr('fill', 'none')
            .attr('stroke', '#2a8caa')
            .attr('stroke-width', 4)
            .attr('d', line);

        // Add data points
        const points = g.selectAll('.data-point')
            .data(gdpData)
            .join('circle')
            .attr('class', d => `data-point data-point-${d.year}`)
            .attr('id', d => `gdp-point-${d.year}`)
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.growth))
            .attr('r', 6)
            .attr('fill', '#2a6caa')
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 10);
                
                // Add tooltip
                const tooltip = g.append('g')
                    .attr('class', 'tooltip')
                    .attr('transform', `translate(${xScale(d.year)},${yScale(d.growth) - 20})`);
                
                tooltip.append('rect')
                    .attr('x', -60)
                    .attr('y', -40)
                    .attr('width', 120)
                    .attr('height', 60)
                    .attr('fill', 'azure')
                    .attr('stroke', '#2a6caa')
                    .attr('rx', 5);
                
                tooltip.append('text')
                    .attr('x', 0)
                    .attr('y', -15)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '20px')
                    .style('font-weight', 'bold')
                    .text(`Year: ${d.year}`);
                
                tooltip.append('text')
                    .attr('x', 0)
                    .attr('y', 8)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '16px')
                    .text(`Growth: ${d.growth}%`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 5);
                g.selectAll('.tooltip').remove();
            });

        // Add chart title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '20px')
            .style('font-weight', 'bold')
            .text('India GDP Annual Growth Rate (2000-2023)');

        // Add axis labels
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height - margin.bottom / 3)
            .attr('text-anchor', 'middle')
            .style('font-size', '20px')
            .text('Year');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(height / 2))
            .attr('y', margin.left / 3)
            .attr('text-anchor', 'middle')
            .style('font-size', '20px')
            .text('GDP Growth (%)');

        // Cleanup function
        return () => {
            container.selectAll('*').remove();
        };
    }, [data]);

    // Handle highlighting separately
    useEffect(() => {
        if (!svgRef.current || !highlightedElements) return;
        
        const svg = svgRef.current;
        
        // Reset all highlights first
        svg.selectAll('.data-point')
            .attr('r', 5)
            .attr('fill', '#2a6caa')
            .attr('stroke', 'none');
        
        svg.selectAll('.tooltip').remove();
        
        // Apply highlights
        if (highlightedElements && Array.isArray(highlightedElements) && highlightedElements.length > 0) {
            highlightedElements.forEach(id => {
                const dataPoint = svg.select(`#${id}`);
                
                if (!dataPoint.empty()) {
                    dataPoint
                        .attr('r', 8)
                        .attr('fill', '#ff5722')
                        .attr('stroke', '#333')
                        .attr('stroke-width', 2);
                }
            });
        }
    }, [highlightedElements]);

    // Handle time-based highlighting
    useEffect(() => {
        if (!svgRef.current || currentTime === null || currentTime === undefined) return;
        
        const currentTimeMs = currentTime;
        
        // Find the data point to highlight based on the current time
        // Check if data and script exist
        if (data && data.script && Array.isArray(data.script.timestamps)) {
            const timePoints = data.script.timestamps;
            
            for (const timePoint of timePoints) {
                if (currentTimeMs >= timePoint.start_time && currentTimeMs <= timePoint.end_time) {
                    if (timePoint.node_id) {
                        const nodeIds = Array.isArray(timePoint.node_id) ? timePoint.node_id : [timePoint.node_id];
                        
                        // Reset all highlights first
                        svgRef.current.selectAll('.data-point')
                            .attr('r', 5)
                            .attr('fill', '#2a6caa')
                            .attr('stroke', 'none');
                        
                        svgRef.current.selectAll('.tooltip').remove();
                        
                        // Highlight the specified nodes
                        nodeIds.forEach(id => {
                            const dataPoint = svgRef.current.select(`#${id}`);
                            
                            if (!dataPoint.empty()) {
                                dataPoint
                                    .attr('r', 8)
                                    .attr('fill', '#ff5722')
                                    .attr('stroke', '#333')
                                    .attr('stroke-width', 2);
                            }
                        });
                    }
                    break;
                }
            }
        }
    }, [currentTime, data]);

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
});

// Set display name
IndiaGDPVisualization.displayName = 'IndiaGDPVisualization';

// Create a default export that doesn't use forwardRef
export default IndiaGDPVisualization;