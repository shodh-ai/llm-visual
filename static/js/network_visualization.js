// Network Data Model Visualization
const createNetworkVisualization = (data) => {
    // Validate input data
    if (!data || !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0 ||
        !data.edges || !Array.isArray(data.edges)) {
        console.error('Invalid data format for network visualization');
        return;
    }

    // Get container dimensions
    const container = d3.select('#visualization-container');
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const nodeWidth = 200;
    const nodeHeight = 160;

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

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes || [])
        .force('link', d3.forceLink()
            .links(data.edges || [])
            .id(d => d && d.id ? d.id : '')
            .distance(300)
            .strength(0.2))
        .force('charge', d3.forceManyBody()
            .strength(-2000))
        .force('collide', d3.forceCollide()
            .radius(Math.max(nodeWidth, nodeHeight)/2 + 20))
        .force('center', d3.forceCenter(0, 0));

    // Create curved links with labels
    const link = g.selectAll('.link')
        .data(data.edges || [])
        .join('g')
        .attr('class', 'link');

    // Add path for each link
    link.append('path')
        .attr('class', 'link-path')
        .style('fill', 'none')
        .style('stroke', '#4299e1')
        .style('stroke-width', '2px')
        .style('stroke-opacity', 0.8);

    // Add link labels
    link.append('text')
        .attr('class', 'link-label')
        .attr('dy', -5)
        .style('fill', '#4299e1')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .text(d => d.description)
        .attr('transform', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const x = (d.source.x + d.target.x) / 2;
            const y = (d.source.y + d.target.y) / 2;
            return `translate(${x},${y}) rotate(${angle})`;
        });

    // Create node containers
    const node = g.selectAll('.node')
        .data(data.nodes || [])
        .join('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));

    // Add node rectangles
    node.append('rect')
        .attr('x', -nodeWidth/2)
        .attr('y', -nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', 5)
        .style('fill', '#1a365d')
        .style('stroke', '#2c5282')
        .style('stroke-width', '1px');

    // Add node headers
    node.append('rect')
        .attr('x', -nodeWidth/2)
        .attr('y', -nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', 40)
        .attr('rx', 5)
        .style('fill', '#4299e1');

    // Add node titles
    node.append('text')
        .attr('x', -nodeWidth/2 + 10)
        .attr('y', -nodeHeight/2 + 25)
        .style('fill', 'white')
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .text(d => d ? d.name || '' : '');

    // Add node properties
    node.each(function(d) {
        if (!d || !d.properties) return;
        const properties = Array.isArray(d.properties) ? d.properties : [];
        const nodeGroup = d3.select(this);
        
        // Add key icon for id property
        const hasIdProperty = properties.some(p => p && p.name && p.name.endsWith('_id'));
        if (hasIdProperty) {
            nodeGroup.append('text')
                .attr('x', -nodeWidth/2 + 10)
                .attr('y', -nodeHeight/2 + 60)
                .style('fill', '#ffd700')
                .style('font-size', '12px')
                .text('🔑');
        }
        
        properties.forEach((prop, i) => {
            if (!prop || !prop.name || !prop.type) return;
            
            const y = -nodeHeight/2 + 60 + i * 20;
            
            // Property name
            nodeGroup.append('text')
                .attr('x', -nodeWidth/2 + (hasIdProperty ? 25 : 10))
                .attr('y', y)
                .style('fill', 'white')
                .style('font-size', '12px')
                .text(prop.name);
            
            // Property type
            nodeGroup.append('text')
                .attr('x', nodeWidth/2 - 10)
                .attr('y', y)
                .style('fill', '#a0aec0')
                .style('font-size', '12px')
                .style('text-anchor', 'end')
                .text(prop.type);
        });
    });

    // Update force simulation on tick
    simulation.on('tick', () => {
        // Update link paths
        link.selectAll('.link-path')
            .attr('d', d => {
                // Normal link with curve
                const sourceX = d.source.x || 0;
                const sourceY = d.source.y || 0;
                const targetX = d.target.x || 0;
                const targetY = d.target.y || 0;
                
                return `M ${sourceX},${sourceY} 
                        Q ${(sourceX + targetX) / 2},${(sourceY + targetY) / 2} 
                        ${targetX},${targetY}`;
            });

        // Update link labels
        link.selectAll('.link-label')
            .attr('transform', d => {
                const sourceX = d.source.x || 0;
                const sourceY = d.source.y || 0;
                const targetX = d.target.x || 0;
                const targetY = d.target.y || 0;
                const x = (sourceX + targetX) / 2;
                const y = (sourceY + targetY) / 2;
                const dx = targetX - sourceX;
                const dy = targetY - sourceY;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                return `translate(${x},${y}) rotate(${angle})`;
            });

        // Update node positions
        node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createNetworkVisualization };
}
