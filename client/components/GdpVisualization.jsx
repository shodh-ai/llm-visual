import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const GdpVisualization = ({ data, highlightedElements, currentTime }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const chartRef = useRef(null);

  // State to track animation progress
  const [animationProgress, setAnimationProgress] = useState(0);

  console.log('GdpVisualization received data:', data);
  if (data && data.nodes) {
    console.log('Node types in data:', data.nodes.map(node => node.type));
  }

  useEffect(() => {
    console.log('GdpVisualization mounted with data:', data);
    if (data && data.nodes) {
      const yearNodes = data.nodes.filter(node => node.type === 'year');
      console.log('Year nodes found:', yearNodes.length);
      console.log('All node types:', [...new Set(data.nodes.map(node => node.type))]);
    }
  }, []);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '500px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1a202c',
          color: 'white'
        }}
      >
        <div>No GDP data available to visualize</div>
      </div>
    );
  }

  useEffect(() => {
    // Force explicit dimensions
    if (containerRef.current) {
      containerRef.current.style.width = '100%';
      containerRef.current.style.height = '500px';
      containerRef.current.style.minHeight = '500px';
      containerRef.current.style.display = 'block';
      containerRef.current.style.position = 'relative';
    }
  }, []);

  useEffect(() => {
    console.log('GDP Visualization data:', data);
    console.log('GDP Visualization highlighted elements:', highlightedElements);
    
    if (
      !containerRef.current ||
      !data ||
      !data.nodes ||
      !Array.isArray(data.nodes) ||
      data.nodes.length === 0
    ) {
      console.error('Invalid data format for GDP visualization:', data);
      return;
    }

    // Get container dimensions
    const container = d3.select(containerRef.current);
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    // Clear any existing SVG
    container.selectAll('*').remove();

    // Define margins for chart area
    const margin = { top: 60, right: 160, bottom: 80, left: 70 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#1a202c');

    svgRef.current = svg;

    // Add zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Create a container (g) for the chart, applying the margins
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
      .attr('class', 'chart-container');

    chartRef.current = g;

    // Prepare data - ensure we're filtering correctly
    const gdpData = data.nodes
      .filter((node) => node.type === 'year')
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    console.log('GDP data before filtering:', data);
    console.log('Container dimensions:', container.node().clientWidth, container.node().clientHeight);
    console.log('Filtered GDP data:', gdpData);

    if (gdpData.length === 0) {
      console.error('No year data found in the visualization data');
      return;
    }

    // X scale
    const xScale = d3
      .scaleBand()
      .domain(gdpData.map((d) => d.name))
      .range([0, chartWidth])
      .padding(0.3);

    // Y scale
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(gdpData, (d) => parseFloat(d.properties[0]))])
      .range([chartHeight, 0])
      .nice();

    console.log('X scale domain:', xScale.domain());
    console.log('Y scale domain:', yScale.domain());

    // Color scale
    const colorScale = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(gdpData, (d) => (d.properties[1] ? parseFloat(d.properties[1]) : 0)),
      ])
      .range(['#4299e1', '#f56565']);

    // X axis
    g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues(
            xScale.domain().filter((d, i) => i % 5 === 0 || i === gdpData.length - 1)
          )
      )
      .selectAll('text')
      .style('text-anchor', 'end')
      .style('fill', 'white')
      .style('font-size', '14px')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // X axis label
    g.append('text')
      .attr('class', 'x-axis-title')
      .attr('text-anchor', 'middle')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 55) // below the axis
      .style('fill', 'white')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Year');

    // Y axis
    g.append('g')
      .call(
        d3.axisLeft(yScale).ticks(10).tickFormat((d) => `$${d} Tn`)
      )
      .selectAll('text')
      .style('fill', 'white')
      .style('font-size', '14px');

    // Y axis label
    g.append('text')
      .attr('class', 'y-axis-title')
      .attr('text-anchor', 'middle')
      .attr('transform', `rotate(-90)`)
      .attr('x', -chartHeight / 2)
      .attr('y', -50) // a bit more space from the axis
      .style('fill', 'white')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('GDP (Trillion USD)');

    // Chart title
    g.append('text')
      .attr('class', 'chart-title')
      .attr('text-anchor', 'middle')
      .attr('x', chartWidth / 2)
      .attr('y', -20) // above the chart
      .style('fill', 'white')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text("India's GDP Growth (2000-2025)");

    // Bars
    const bars = g
      .selectAll('.bar')
      .data(gdpData)
      .enter()
      .append('g')
      .attr('class', d => `bar node-${d.id}`);

    // Rectangles with transition
    bars
      .append('rect')
      .attr('x', 0)
      .attr('y', chartHeight)
      .attr('width', (d) => {
        console.log('Bar width for', d.name, ':', xScale.bandwidth());
        return xScale.bandwidth();
      })
      .attr('height', 0)
      .attr('fill', (d) => {
        // Use the second property (growth rate) for color if available
        if (d.properties && d.properties.length > 1) {
          const growthRate = parseFloat(d.properties[1]);
          return growthRate >= 5 ? '#f56565' : '#4299e1';
        }
        return '#4299e1'; // Default color
      })
      .attr('stroke', '#4299e1')
      .attr('stroke-width', 1)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100)
      .attr('y', (d) => {
        const y = yScale(parseFloat(d.properties[0]));
        console.log('Bar y position for', d.name, ':', y);
        return y;
      })
      .attr('height', (d) => {
        const height = chartHeight - yScale(parseFloat(d.properties[0]));
        console.log('Bar height for', d.name, ':', height);
        return height;
      });

    // Value labels
    bars
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(parseFloat(d.properties[0])) - 5)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-size', '0px') // Start with size 0
      .text((d) => `$${d.properties[0]}T`)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100 + 500)
      .style('font-size', '10px');

    // Growth labels
    bars
      .append('text')
      .attr('class', 'growth-label')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', chartHeight - 20)
      .attr('text-anchor', 'middle')
      .style('fill', (d) =>
        d.properties[1] && parseFloat(d.properties[1]) > 5 ? '#f56565' : '#4299e1'
      )
      .style('font-size', '12px')
      .style('opacity', 0)
      .text((d) =>
        d.properties[1]
          ? `${parseFloat(d.properties[1]) > 0 ? '+' : ''}${d.properties[1]}%`
          : ''
      )
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100 + 800)
      .attr('y', (d) => yScale(parseFloat(d.properties[0])) - 20)
      .style('opacity', 1);

    // Trend line
    const lineGenerator = d3
      .line()
      .x((d) => xScale(d.name) + xScale.bandwidth() / 2)
      .y((d) => yScale(parseFloat(d.properties[0])))
      .curve(d3.curveMonotoneX);

    const trendPath = g
      .append('path')
      .datum(gdpData)
      .attr('class', 'trend-line')
      .attr('fill', 'none')
      .attr('stroke', '#90cdf4')
      .attr('stroke-width', 2)
      .attr('d', lineGenerator);

    // Animate the line drawing
    const totalLength = trendPath.node().getTotalLength();
    trendPath
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(2000)
      .delay(gdpData.length * 100 + 500)
      .attr('stroke-dashoffset', 0);

    // Legend
    const legendGroup = g
      .append('g')
      .attr('class', 'legend')
      // place legend in top-right corner of chart area
      .attr('transform', `translate(${chartWidth + 20}, 50)`);

    // Legend title
    legendGroup
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', 'white')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Growth Rate');

    const legendItems = [
      { color: '#4299e1', label: 'Low Growth (<5%)' },
      { color: '#f56565', label: 'High Growth (>5%)' },
    ];

    legendItems.forEach((item, i) => {
      const itemGroup = legendGroup
        .append('g')
        .attr('transform', `translate(0, ${20 + i * 20})`);

      itemGroup
        .append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color);

      itemGroup
        .append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('fill', 'white')
        .style('font-size', '12px')
        .text(item.label);
    });

    // Timeline track (optional — you can adjust or remove if desired)
    g.append('rect')
      .attr('class', 'timeline-track')
      .attr('x', 0)
      .attr('y', chartHeight + 30)
      .attr('width', chartWidth)
      .attr('height', 4)
      .attr('fill', '#2d3748');

    g.append('circle')
      .attr('class', 'timeline-thumb')
      .attr('cx', 0)
      .attr('cy', chartHeight + 32)
      .attr('r', 8)
      .attr('fill', '#90cdf4');

    // Animate the timeline
    const animateBars = () => {
      console.log('Starting bar animation');
      
      // Directly set the bars to their final state
      svg.selectAll('.bar rect')
        .attr('y', (d) => yScale(parseFloat(d.properties[0])))
        .attr('height', (d) => chartHeight - yScale(parseFloat(d.properties[0])));
        
      console.log('Animation complete');
    };

    // Call it immediately instead of with a timeout
    animateBars();

    // Cleanup
    return () => {
      if (svgRef.current) {
        svgRef.current.selectAll('*').interrupt();
      }
    };
  }, [data]);

  // Add a mapping function to handle different node ID formats
  const getNodeSelector = (id) => {
    // Handle numeric year IDs (2000, 2020, etc.)
    if (/^\d{4}$/.test(id)) {
      return `.node-${id}`;
    }
    
    // Handle special IDs like 'trend-line'
    if (id === 'trend-line') {
      return '.trend-line';
    }
    
    // Default case
    return `.node-${id}`;
  };

  // Update the highlighting useEffect
  useEffect(() => {
    if (!svgRef.current || !highlightedElements) return;

    const svg = svgRef.current;
    console.log('Applying highlights to elements:', highlightedElements);

    // Reset all highlights
    svg.selectAll('.bar rect')
      .style('stroke', 'none')
      .style('stroke-width', 0)
      .style('filter', null);

    svg.selectAll('.bar text')
      .style('font-weight', 'normal')
      .style('font-size', '10px');

    svg.selectAll('.trend-line')
      .style('stroke', '#90cdf4')
      .style('stroke-width', 2)
      .style('filter', null);

    svg.selectAll('.dot')
      .attr('r', 4)
      .style('filter', null);

    // Apply new highlights
    if (highlightedElements && highlightedElements.length > 0) {
      highlightedElements.forEach((id) => {
        console.log(`Highlighting element with ID: ${id}`);
        
        if (id === 'trend-line') {
          // Highlight the trend line
          svg.select('.trend-line')
            .style('stroke', '#f56565')
            .style('stroke-width', 4)
            .style('filter', 'drop-shadow(0 0 6px rgba(245, 101, 101, 0.5))');
          
          svg.selectAll('.dot')
            .attr('r', 6)
            .style('filter', 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.7))');
        } else {
          // Highlight the specific bar
          const selector = getNodeSelector(id);
          console.log(`Using selector: ${selector}`);
          
          const barElement = svg.select(`${selector} rect`);
          
          if (!barElement.empty()) {
            console.log(`Found element with selector: ${selector}`);
            barElement
              .style('stroke', '#f56565')
              .style('stroke-width', 3)
              .style('filter', 'drop-shadow(0 0 8px rgba(245, 101, 101, 0.7))');
            
            // Also highlight the text labels
            svg.selectAll(`${selector} text`)
              .style('font-weight', 'bold')
              .style('font-size', '12px')
              .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))');
          } else {
            console.log(`No element found with selector: ${selector}`);
          }
        }
      });
    }
  }, [highlightedElements]);

  // currentTime-based updates
  useEffect(() => {
    if (!svgRef.current || currentTime === undefined || currentTime === null) return;
    
    const normalizedTime = Math.min(100, Math.max(0, currentTime));
    const svg = svgRef.current;
    
    // Update timeline position if it exists
    const timelineThumb = svg.select('.timeline-thumb');
    if (!timelineThumb.empty()) {
      const timelineTrack = svg.select('.timeline-track');
      const trackWidth = timelineTrack.node().getBBox().width;
      timelineThumb.attr('cx', (trackWidth * normalizedTime) / 100);
    }
    
    // Animate bars based on timeline
    if (normalizedTime < 100) {
      const visibleBars = Math.ceil((normalizedTime / 100) * svg.selectAll('.bar').size());
      
      svg.selectAll('.bar')
        .style('opacity', (d, i) => (i < visibleBars ? 1 : 0.3));
    } else {
      svg.selectAll('.bar').style('opacity', 1);
    }
  }, [currentTime]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && svgRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        svgRef.current.attr('width', width).attr('height', height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add this function to create default data if needed
  const createDefaultGdpData = () => {
    return [
      {"id": "2000", "name": "2000", "type": "year", "properties": ["0.47", "4.0"]},
      {"id": "2005", "name": "2005", "type": "year", "properties": ["0.82", "7.9"]},
      {"id": "2010", "name": "2010", "type": "year", "properties": ["1.66", "8.5"]},
      {"id": "2015", "name": "2015", "type": "year", "properties": ["2.10", "8.0"]},
      {"id": "2020", "name": "2020", "type": "year", "properties": ["2.66", "-6.6"]},
      {"id": "2021", "name": "2021", "type": "year", "properties": ["3.18", "8.7"]},
      {"id": "2022", "name": "2022", "type": "year", "properties": ["3.39", "7.2"]},
      {"id": "2023", "name": "2023", "type": "year", "properties": ["3.74", "6.3"]},
      {"id": "2024", "name": "2024", "type": "year", "properties": ["4.05", "6.5"]},
      {"id": "2025", "name": "2025", "type": "year", "properties": ["4.44", "6.5"]}
    ];
  };

  // Call this function instead of the complex rendering
  useEffect(() => {
    renderSimpleChart();
  }, [data]);

  // Add this simplified rendering function
  const renderSimpleChart = () => {
    if (!containerRef.current || !data || !data.nodes) return;
    
    console.log('Rendering enhanced GDP chart');
    
    // Clear container
    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();
    
    // Get dimensions
    const width = container.node().clientWidth;
    const height = container.node().clientHeight || 500;
    
    // Create SVG
    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#1a202c');
    
    svgRef.current = svg;
    
    // Filter data with fallback
    let gdpData = [];
    if (data && data.nodes && Array.isArray(data.nodes)) {
      gdpData = data.nodes
        .filter(node => node.type === 'year')
        .sort((a, b) => parseInt(a.name) - parseInt(b.name));
    }

    // If no data found, use default data
    if (gdpData.length === 0) {
      console.log('No year data found, using default data');
      gdpData = createDefaultGdpData();
    }
    
    // Enhanced bar chart
    const margin = { top: 60, right: 160, bottom: 80, left: 70 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    chartRef.current = g;
    
    // Scales
    const xScale = d3.scaleBand()
      .domain(gdpData.map(d => d.name))
      .range([0, chartWidth])
      .padding(0.3);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(gdpData, d => parseFloat(d.properties[0])) * 1.1]) // Add 10% padding
      .range([chartHeight, 0])
      .nice();
    
    // Draw bars
    const bars = g.selectAll('.bar')
      .data(gdpData)
      .enter()
      .append('g')
      .attr('class', d => `bar node-${d.id}`);
    
    bars.append('rect')
      .attr('x', d => xScale(d.name))
      .attr('y', d => yScale(parseFloat(d.properties[0])))
      .attr('width', xScale.bandwidth())
      .attr('height', d => chartHeight - yScale(parseFloat(d.properties[0])))
      .attr('fill', d => {
        // Use the second property (growth rate) for color if available
        if (d.properties && d.properties.length > 1) {
          const growthRate = parseFloat(d.properties[1]);
          return growthRate >= 5 ? '#f56565' : '#4299e1';
        }
        return '#4299e1'; // Default color
      })
      .attr('stroke', 'none')
      .attr('stroke-width', 0);
    
    // Add value labels on top of bars
    bars.append('text')
      .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(parseFloat(d.properties[0])) - 10)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-size', '10px')
      .text(d => `$${d.properties[0]}T`);
    
    // Add growth rate labels
    bars.append('text')
      .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(parseFloat(d.properties[0])) - 25)
      .attr('text-anchor', 'middle')
      .style('fill', d => {
        if (d.properties && d.properties.length > 1) {
          const growthRate = parseFloat(d.properties[1]);
          return growthRate >= 5 ? '#f56565' : '#4299e1';
        }
        return '#4299e1';
      })
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text(d => {
        if (d.properties && d.properties.length > 1) {
          const growthRate = parseFloat(d.properties[1]);
          return growthRate > 0 ? `+${d.properties[1]}%` : `${d.properties[1]}%`;
        }
        return '';
      });
    
    // Add X axis
    g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickValues(xScale.domain().filter((d, i) => i % 5 === 0 || i === gdpData.length - 1))
      )
      .selectAll('text')
      .style('text-anchor', 'end')
      .style('fill', 'white')
      .style('font-size', '12px')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
    
    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => `$${d}Tn`)
      )
      .selectAll('text')
      .style('fill', 'white')
      .style('font-size', '12px');
    
    // Add Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -chartHeight / 2)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-size', '14px')
      .text('GDP (Trillion USD)');
    
    // Add X axis label
    g.append('text')
      .attr('y', chartHeight + 60)
      .attr('x', chartWidth / 2)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-size', '14px')
      .text('Year');
    
    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text("India's GDP Growth (2000-2025)");
    
    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 150}, ${margin.top})`);
    
    legend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', 'white')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Growth Rate');
    
    // Low growth legend item
    legend.append('rect')
      .attr('x', 0)
      .attr('y', 15)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#4299e1');
    
    legend.append('text')
      .attr('x', 25)
      .attr('y', 27)
      .style('fill', 'white')
      .style('font-size', '12px')
      .text('Low Growth (<5%)');
    
    // High growth legend item
    legend.append('rect')
      .attr('x', 0)
      .attr('y', 40)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#f56565');
    
    legend.append('text')
      .attr('x', 25)
      .attr('y', 52)
      .style('fill', 'white')
      .style('font-size', '12px')
      .text('High Growth (>5%)');
    
    // Add a trend line
    if (gdpData.length > 1) {
      const lineData = gdpData.map(d => ({
        year: d.name,
        value: parseFloat(d.properties[0])
      }));
      
      const line = d3.line()
        .x(d => xScale(d.year) + xScale.bandwidth() / 2)
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);
      
      g.append('path')
        .datum(lineData)
        .attr('class', 'trend-line')
        .attr('fill', 'none')
        .attr('stroke', '#90cdf4')
        .attr('stroke-width', 2)
        .attr('d', line);
      
      // Add dots at each data point on the line
      g.selectAll('.dot')
        .data(lineData)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr('cy', d => yScale(d.value))
        .attr('r', 4)
        .attr('fill', 'white');
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    />
  );
};

export default GdpVisualization;
