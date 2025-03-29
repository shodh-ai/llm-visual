// Historical Evolution Visualization
const createHistoryVisualization = (data) => {
    // Validate input data
    if (!data || !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
        console.error('Invalid data format for history visualization');
        return;
    }

    // Get container dimensions
    const container = d3.select('#visualization-container');
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const nodeRadius = 60;
    const eraRadius = 80;

    // Clear any existing SVG
    container.selectAll('*').remove();

    // Create SVG with zoom support
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background-color', '#1a202c');

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 2])
        .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Create a container for the zoomable content
    const g = svg.append('g')
        .attr('transform', `translate(${width/2},${height/2})`);

    // Create arrow marker for links
    svg.append('defs').selectAll('marker')
        .data(['arrow'])
        .join('marker')
        .attr('id', d => d)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 45)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .style('fill', '#4299e1');

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges)
            .id(d => d.id)
            .distance(200))
        .force('charge', d3.forceManyBody()
            .strength(-1000))
        .force('collision', d3.forceCollide().radius(d => 
            d.type === 'era' ? eraRadius + 20 : nodeRadius + 20))
        .force('x', d3.forceX(0).strength(0.1))
        .force('y', d3.forceY(0).strength(0.1));

    // Create links
    const link = g.selectAll('.link')
        .data(data.edges)
        .join('g')
        .attr('class', 'link');

    // Add path for each link
    link.append('path')
        .style('fill', 'none')
        .style('stroke', '#4299e1')
        .style('stroke-width', '2px')
        .attr('marker-end', 'url(#arrow)');

    // Add link labels
    link.append('text')
        .attr('dy', -10)
        .style('fill', '#4299e1')
        .style('font-size', '12px')
        .style('text-anchor', 'middle')
        .text(d => d.description);

    // Create nodes
    const node = g.selectAll('.node')
        .data(data.nodes)
        .join('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));

    // Add circles for nodes
    node.append('circle')
        .attr('r', d => d.type === 'era' ? eraRadius : nodeRadius)
        .style('fill', d => d.type === 'era' ? '#2c5282' : '#2a4365')
        .style('stroke', '#4299e1')
        .style('stroke-width', '2px');

    // Add node labels
    node.append('text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .style('fill', 'white')
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .text(d => d.name);

    // Add property lists
    node.each(function(d) {
        const nodeGroup = d3.select(this);
        const radius = d.type === 'era' ? eraRadius : nodeRadius;
        
        // Create property list
        const properties = nodeGroup.selectAll('.property')
            .data(d.properties || [])
            .join('text')
            .attr('class', 'property')
            .attr('dy', (_, i) => radius + 20 + i * 20)
            .attr('text-anchor', 'middle')
            .style('fill', '#a0aec0')
            .style('font-size', '12px')
            .text(p => p);
    });

    // Update force simulation on tick
    simulation.on('tick', () => {
        // Update link positions
        link.selectAll('path').attr('d', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const angle = Math.atan2(dy, dx);
            
            // Calculate start and end points offset by node radius
            const sourceRadius = d.source.type === 'era' ? eraRadius : nodeRadius;
            const targetRadius = d.target.type === 'era' ? eraRadius : nodeRadius;
            
            const startX = d.source.x + sourceRadius * Math.cos(angle);
            const startY = d.source.y + sourceRadius * Math.sin(angle);
            const endX = d.target.x - targetRadius * Math.cos(angle);
            const endY = d.target.y - targetRadius * Math.sin(angle);
            
            return `M${startX},${startY}L${endX},${endY}`;
        });

        // Update link label positions
        link.selectAll('text')
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);

        // Update node positions
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

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
};
