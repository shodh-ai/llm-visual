const createEntityVisualization = (data) => {
    console.log('Starting entity visualization with data:', data);

    // Get container dimensions
    const container = d3.select('#visualization-container');
    const width = container.node().clientWidth;
    const height = container.node().clientHeight * 1;

    // Clear existing SVG
    container.selectAll('*').remove();

    // Create SVG with zoom support
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Create a container for zoomable content
    const g = svg.append('g');

    // Add diagram labels within the zoomable container
    g.append('text')
        .attr('x', width / 2)
        .attr('y', height / 6 + 80)  // Positioned relative to first diagram
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-weight', 'bold')
        .text('Entity-Relationship (ER) model');

    g.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 80)  // Positioned relative to second diagram
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-weight', 'bold')
        .text('Strong Entity & Weak Entity');

    g.append('text')
        .attr('x', width / 2)
        .attr('y', (5 * height) / 6 + 80)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-weight', 'bold')
        .text('Multivalued & Associative Entity');

    // Define arrow markers for relationships
    svg.append('defs')
        .append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-10 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-10,-5L0,0L-10,5')
        .attr('fill', '#ff5733');

    // Create force simulation with enhanced parameters
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(10));

    // Create straight lines for relationships
    const link = g.append('g')
        .selectAll('line')
        .data(data.edges)
        .join('line')
        .attr('class', 'relationship-link')
        .style('stroke', '#ff5733')
        .style('stroke-width', 2)
        .attr('marker-end', d => {
            if (d.type === 'attribute' || 
                (d.source === 'student' && d.target === 'study') || 
                (d.source === 'study' && d.target === 'course')) {
                return null;
            }
            return 'url(#arrowhead)';
        });

    // Create parallel lines for weak entity relationship
    const weakLink = g.append('g')
        .selectAll('line')
        .data(data.edges.filter(d => d.source.id === 'borrows' && d.target.id === 'loan'))
        .join('line')
        .attr('class', 'relationship-link')
        .style('stroke', '#ff5733')
        .style('stroke-width', 2);

    // Create nodes
    const node = g.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', 'er-node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add shapes for different node types
    node.each(function(d) {
        const erNode = d3.select(this);
        
        if (d.id === 'works_on') {
            // Rectangle background for associative entity
            erNode.append('rect')
                .attr('width', 120)
                .attr('height', 50)
                .attr('x', -60)
                .attr('y', -25)
                .style('fill', '#1e3a8a')
                .style('stroke', '#ff5733')
                .style('stroke-width', 2);

            // Diamond shape inside rectangle
            erNode.append('polygon')
                .attr('points', '-55,0 0,-25 55,0 0,25')
                .style('fill', '#047857')
                .style('stroke', '#ff5733')
                .style('stroke-width', 2);

            erNode.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '45')
                .attr('fill', '#000000')
                .attr('font-size', '15px')
                .attr('font-weight', 'bold')
                .text('Associative Entity');
        }

        else if (d.id === 'student' || d.id === 'course' || d.id === 'customer' || d.id === 'employee' || d.id === 'project') {
            // Strong entities
            erNode.append('rect')
                .attr('width', 120)
                .attr('height', 50)
                .attr('x', -60)
                .attr('y', -25)
                .style('fill', '#1e3a8a')
                .style('stroke', '#ff5733')
                .style('stroke-width', 2);

            let labelText = 'Entity';
            if (d.id === 'customer') {
                labelText = 'Strong Entity';
            }
            else if (d.id === 'employee') {
                labelText = 'Multivalued Entity';
            }
            erNode.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '40')
                .attr('fill', '#000000')
                .attr('font-size', '15px')
                .attr('font-weight', 'bold')
                .text(labelText);
        } 
        else if (d.id === 'study' || d.id === 'borrows' || d.id === 'works_on') {
            // Relationships
            if (d.id === 'borrows') {
                erNode.append('polygon')
                    .attr('points', '-55,0 0,-35 55,0 0,35')
                    .style('fill', 'none')
                    .style('stroke', '#ff5733')
                    .style('stroke-width', 2);
            }
            
            erNode.append('polygon')
                .attr('points', '-50,0 0,-30 50,0 0,30')
                .style('fill', '#047857')
                .style('stroke', '#ff5733')
                .style('stroke-width', 2);
            
                        if (d.id === 'borrows') {
                erNode.append('polygon')
                    .attr('points', '-55,0 0,-35 55,0 0,35')
                    .style('fill', 'none')
                    .style('stroke', '#ff5733')
                    .style('stroke-width', 2);
            }
            let labelText = 'Relationship';
            if (d.id === 'works_on') {
                labelText = 'Associative Entity';
            }
            erNode.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '50')
                .attr('fill', '#000000')
                .attr('font-size', '15px')
                .attr('font-weight', 'bold')
                .text(labelText);
        }
        else if (d.id === 'loan') {
            // Loan entity (weak) - double rectangle
            erNode.append('rect')
                .attr('width', 130)
                .attr('height', 60)
                .attr('x', -65)
                .attr('y', -30)
                .style('fill', 'none')
                .style('stroke', '#ff5733')
                .style('stroke-width', 2);

            erNode.append('rect')
                .attr('width', 120)
                .attr('height', 50)
                .attr('x', -60)
                .attr('y', -25)
                .style('fill', '#1e3a8a')
                .style('stroke', '#ff5733')
                .style('stroke-width', 2);

            erNode.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '45')
                .attr('fill', '#000000')
                .attr('font-size', '15px')
                .attr('font-weight', 'bold')
                .text('Weak Entity');
        }
        else if (d.type === 'attribute') {
            // Attributes (circles)
            erNode.append('circle')
                .attr('r', 25)
                .style('fill', 'white')
                .style('stroke', '#ff5733')
                .style('stroke-width', 2);
        }
        else if (d.type === 'multivalued') {
            // Multivalued attributes (double circles)
            erNode.append('circle')
                .attr('r', 30)
                .style('fill', 'none')
                .style('stroke', '#ff5733')
                .style('stroke-width', 2);
            
            erNode.append('circle')
                .attr('r', 25)
                .style('fill', 'white')
                .style('stroke', '#ff5733')
                .style('stroke-width', 2);

            erNode.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '45')
                .attr('fill', '#000000')
                .attr('font-size', '15px')
                .attr('font-weight', 'bold')
                .text('Multivalued Attribute');
        }

        // Add text inside nodes
        const nodeText = erNode.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', (d.type === 'attribute' || d.type === 'multivalued') ? '#000000' : 'white')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(d.name);

        // Add underline for c_id
        if (d.id === 'c_id') {
            nodeText.append('tspan')
                .attr('x', 0)
                .attr('dy', '0.3em')
                .attr('stroke', '#000000')
                .attr('stroke-width', '1')
                .attr('text-anchor', 'middle')
                .text('_'.repeat(d.name.length));
        }
    });

    // Position nodes with adjusted vertical spacing
    const topSection = height / 6 - 20;
    const middleSection = height / 2 - 20;
    const bottomSection = (5 * height) / 6 - 20;
    
    data.nodes.forEach(node => {
        // First diagram positioning
        if (node.id === 'student') {
            node.fx = width / 2 - 200;
            node.fy = topSection;
        }
        else if (node.id === 'course') {
            node.fx = width / 2 + 200;
            node.fy = topSection;
        }
        else if (node.id === 'study') {
            node.fx = width / 2;
            node.fy = topSection;
        }
        // Second diagram positioning
        else if (node.id === 'customer') {
            node.fx = width / 2 - 200;
            node.fy = middleSection;
        }
        else if (node.id === 'loan') {
            node.fx = width / 2 + 200;
            node.fy = middleSection;
        }
        else if (node.id === 'borrows') {
            node.fx = width / 2;
            node.fy = middleSection;
        }
        // Third diagram positioning
        else if (node.id === 'employee') {
            node.fx = width / 2 - 200;
            node.fy = bottomSection;
        }
        else if (node.id === 'project') {
            node.fx = width / 2 + 200;
            node.fy = bottomSection;
        }
        else if (node.id === 'works_on') {
            node.fx = width / 2;
            node.fy = bottomSection;
        }
        else if (node.id === 'skills') {
            node.fx = width / 2 - 300;
            node.fy = bottomSection + 50;
        }
        // Attribute positioning
        else if (node.id === 'c_id') {
            node.fx = width / 2 - 300;
            node.fy = middleSection - 100;
        }
        else if (node.id === 'c_name') {
            node.fx = width / 2 - 300;
            node.fy = middleSection + 100;
        }
        else if (node.id === 'l_name') {
            node.fx = width / 2 + 300;
            node.fy = middleSection - 100;
        }
        else if (node.id === 'l_date') {
            node.fx = width / 2 + 300;
            node.fy = middleSection + 100;
        }
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
        // Update link positions for straight lines
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        // Update weak entity link positions
        weakLink
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        // Update node positions
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
         // Release the fixed position to allow natural movement
        d.fx = null;
        d.fy = null;
    }

    // Add highlighting functionality
    window.highlightNode = (nodeId) => {
        node.select('rect, circle, polygon')
            .style('stroke', d => d.id === nodeId ? '#ff8566' : '#ff5733')
            .style('stroke-width', d => d.id === nodeId ? 4 : 2);
    };

    window.resetHighlights = () => {
        node.select('rect, circle, polygon')
            .style('stroke', '#ff5733')
            .style('stroke-width', 2);
    };

    return simulation;
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createEntityVisualization };
}