// XML Database Management Visualization
const createXMLVisualization = (data) => {
    // Validate input data
    if (!data || !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
        console.error('Invalid data format for XML visualization');
        return;
    }

    // Get container dimensions
    const container = d3.select('#visualization-container');
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const nodeRadius = 70;

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
        .force('collision', d3.forceCollide().radius(nodeRadius + 20))
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

    // Add circles for nodes with different colors based on type
    node.append('circle')
        .attr('r', nodeRadius)
        .style('fill', d => {
            switch(d.type) {
                case 'core': return '#2c5282';
                case 'concept': return '#2a4365';
                case 'storage': return '#44337a';
                case 'query': return '#322659';
                case 'language': return '#3c366b';
                case 'validation': return '#3c366b';
                case 'programming': return '#3c366b';
                default: return '#2a4365';
            }
        })
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

    // Create tooltip for code examples
    const tooltip = container.append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', '#2d3748')
        .style('color', 'white')
        .style('padding', '10px')
        .style('border-radius', '5px')
        .style('font-family', 'monospace')
        .style('white-space', 'pre')
        .style('pointer-events', 'none')
        .style('z-index', '1000');

    // Add property lists and hover behavior
    node.each(function(d) {
        const nodeGroup = d3.select(this);
        
        // Create property list
        const properties = nodeGroup.selectAll('.property')
            .data(d.properties || [])
            .join('text')
            .attr('class', 'property')
            .attr('dy', (_, i) => nodeRadius + 20 + i * 20)
            .attr('text-anchor', 'middle')
            .style('fill', '#a0aec0')
            .style('font-size', '12px')
            .text(p => p);

        // Add hover behavior for nodes with examples
        if (d.document && d.document.example) {
            nodeGroup
                .on('mouseover', (event) => {
                    tooltip
                        .style('visibility', 'visible')
                        .text(d.document.example);
                })
                .on('mousemove', (event) => {
                    tooltip
                        .style('top', (event.pageY - 10) + 'px')
                        .style('left', (event.pageX + 10) + 'px');
                })
                .on('mouseout', () => {
                    tooltip.style('visibility', 'hidden');
                });
        }
    });

    // Update force simulation on tick
    simulation.on('tick', () => {
        // Update link positions
        link.selectAll('path').attr('d', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const angle = Math.atan2(dy, dx);
            
            const startX = d.source.x + nodeRadius * Math.cos(angle);
            const startY = d.source.y + nodeRadius * Math.sin(angle);
            const endX = d.target.x - nodeRadius * Math.cos(angle);
            const endY = d.target.y - nodeRadius * Math.sin(angle);
            
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
