// Document Data Model Visualization (NoSQL)
const createDocumentVisualization = (data) => {
    // Validate input data
    if (!data || !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
        console.error('Invalid data format for document visualization');
        return;
    }

    // Get container dimensions
    const container = d3.select('#visualization-container');
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const collectionWidth = 400;
    const padding = 20;
    const indentSize = 20;

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

    // Function to calculate collection height based on document content
    function calculateCollectionHeight(document, level = 0) {
        let height = 30; // Header height
        
        function processValue(value, currentLevel) {
            if (Array.isArray(value)) {
                height += 25; // Array header
                value.forEach(item => {
                    if (typeof item === 'object' && item !== null) {
                        processValue(item, currentLevel + 1);
                    } else {
                        height += 25;
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([key, val]) => {
                    height += 25;
                    if (typeof val === 'object' && val !== null) {
                        processValue(val, currentLevel + 1);
                    }
                });
            } else {
                height += 0; // Value is included in the key's height
            }
        }

        processValue(document, level);
        return height;
    }

    // Calculate collection heights
    data.nodes.forEach(node => {
        node.height = calculateCollectionHeight(node.document);
    });

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges || [])
            .id(d => d.id)
            .distance(400)
            .strength(0.2))
        .force('charge', d3.forceManyBody()
            .strength(-2000))
        .force('collide', d3.forceCollide()
            .radius(d => Math.max(collectionWidth, d.height)/2 + 50)
            .strength(1))
        .force('x', d3.forceX(0).strength(0.1))
        .force('y', d3.forceY(0).strength(0.1));

    // Create reference lines
    if (data.edges) {
        const reference = g.selectAll('.reference')
            .data(data.edges)
            .join('g')
            .attr('class', 'reference');

        // Add path for each reference
        reference.append('path')
            .attr('class', 'reference-path')
            .style('fill', 'none')
            .style('stroke', '#4299e1')
            .style('stroke-width', '2px')
            .style('stroke-dasharray', '5,5')
            .style('opacity', 0.6);

        // Add reference labels
        reference.append('text')
            .attr('class', 'reference-label')
            .style('fill', '#4299e1')
            .style('font-size', '12px')
            .style('font-family', 'monospace')
            .text(d => d.description);
    }

    // Create collections
    const collection = g.selectAll('.collection')
        .data(data.nodes)
        .join('g')
        .attr('class', 'collection')
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));

    // Add collection background
    collection.append('rect')
        .attr('class', 'collection-bg')
        .attr('x', -collectionWidth/2)
        .attr('y', d => -d.height/2)
        .attr('width', collectionWidth)
        .attr('height', d => d.height)
        .attr('rx', 8)
        .style('fill', '#2a4365')
        .style('stroke', '#4299e1')
        .style('stroke-width', '2px');

    // Add collection header
    collection.append('rect')
        .attr('class', 'collection-header')
        .attr('x', -collectionWidth/2)
        .attr('y', d => -d.height/2)
        .attr('width', collectionWidth)
        .attr('height', 30)
        .attr('rx', 8)
        .style('fill', '#4299e1');

    // Add collection name
    collection.append('text')
        .attr('class', 'collection-name')
        .attr('x', -collectionWidth/2 + padding)
        .attr('y', d => -d.height/2 + 20)
        .style('fill', 'white')
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .text(d => d.name);

    // Function to recursively render document content
    function renderDocument(parent, content, x, y, level = 0) {
        if (Array.isArray(content)) {
            // Render array
            parent.append('text')
                .attr('x', x + level * indentSize)
                .attr('y', y)
                .style('fill', '#a0aec0')
                .style('font-family', 'monospace')
                .style('font-size', '12px')
                .text('[');
            
            content.forEach((item, index) => {
                y += 25;
                if (typeof item === 'object' && item !== null) {
                    y = renderDocument(parent, item, x, y, level + 1);
                } else {
                    parent.append('text')
                        .attr('x', x + (level + 1) * indentSize)
                        .attr('y', y)
                        .style('fill', '#e2e8f0')
                        .style('font-family', 'monospace')
                        .style('font-size', '12px')
                        .text(JSON.stringify(item) + (index < content.length - 1 ? ',' : ''));
                }
            });
            
            y += 25;
            parent.append('text')
                .attr('x', x + level * indentSize)
                .attr('y', y)
                .style('fill', '#a0aec0')
                .style('font-family', 'monospace')
                .style('font-size', '12px')
                .text(']');
                
        } else if (typeof content === 'object' && content !== null) {
            // Render object
            Object.entries(content).forEach(([key, value]) => {
                parent.append('text')
                    .attr('x', x + level * indentSize)
                    .attr('y', y)
                    .style('fill', '#a0aec0')
                    .style('font-family', 'monospace')
                    .style('font-size', '12px')
                    .text(key + ': ');

                if (typeof value === 'object' && value !== null) {
                    y += 25;
                    y = renderDocument(parent, value, x, y, level + 1);
                } else {
                    parent.append('text')
                        .attr('x', x + level * indentSize + key.length * 7 + 10)
                        .attr('y', y)
                        .style('fill', '#e2e8f0')
                        .style('font-family', 'monospace')
                        .style('font-size', '12px')
                        .text(JSON.stringify(value));
                }
                y += 25;
            });
        }
        return y;
    }

    // Render document content for each collection
    collection.each(function(d) {
        const documentGroup = d3.select(this);
        renderDocument(
            documentGroup,
            d.document,
            -collectionWidth/2 + padding,
            -d.height/2 + 50
        );
    });

    // Update force simulation on tick
    simulation.on('tick', () => {
        // Update reference paths and labels
        if (data.edges) {
            g.selectAll('.reference').each(function(d) {
                const path = d3.select(this).select('.reference-path');
                const label = d3.select(this).select('.reference-label');
                
                if (!d.source || !d.target) return;
                
                const sourceX = d.source.x || 0;
                const sourceY = d.source.y || 0;
                const targetX = d.target.x || 0;
                const targetY = d.target.y || 0;
                
                const pathData = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
                
                path.attr('d', pathData);
                
                // Position label at midpoint
                const midX = (sourceX + targetX) / 2;
                const midY = (sourceY + targetY) / 2;
                
                label.attr('x', midX)
                    .attr('y', midY - 10)
                    .style('text-anchor', 'middle');
            });
        }

        // Update collection positions
        collection.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
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
