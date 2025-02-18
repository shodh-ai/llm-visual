const createNormalizationVisualization = (data) => {
    // Select container & set dimensions
    const container = d3.select('#visualization-container');
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    // Clear old content
    container.selectAll('*').remove();

    const colors = {
        background: '#000814',
        surface: '#1E1E1E',
        primary: '#BB86FC',
        primaryVariant: '#ffd166',
        secondary: '#ffd166',
        origT1: '#FF6381',
        origT2: '#36A2EB',
        text: {
            primary: '#E1E1E1',
            heading: '#f7fff7',
            subheading: '#fefae0',
            secondary: '#B0B0B0'
        },
        divider: '#2D2D2D'
    };

    // Create an SVG with improved dark theme
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background-color', colors.background)
        .style('font-family', 'Inter, sans-serif'); // More modern font

    // Add a subtle gradient background
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'bg-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
    
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colors.background);
    
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#181818');
    
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'url(#bg-gradient)');

    // Add a heading with improved typography
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 50)
        .attr('text-anchor', 'middle')
        .attr('font-size', '28px')
        .attr('font-weight', 'bold')
        .attr('fill', colors.text.heading)
        .text('Introduction to Normalization');

    // Add subtitle with same color as heading
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 85)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('fill', colors.text.subheading) // Same color as heading
        .text('Click on any table to see definitions');

    // Main group for everything
    const g = svg.append('g')
        .attr('transform', `translate(0, 40)`);

    // Create an improved marker for arrowheads
    defs.append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 15)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', colors.secondary);

    // Force simulation with fixed positions for stability
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges).id(d => d.id).distance(200))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(120))
        .alphaDecay(0.05); // Faster stabilization

    // -- MODAL GROUPS --
    // Main modal group
    const modal = svg.append('g')
        .attr('class', 'definition-modal')
        .style('opacity', 0)
        .style('pointer-events', 'none');

    // Modal background rectangle (only the rect):
    const modalRect = modal.append('rect')
        .attr('width', 300) // temporary; will be resized dynamically
        .attr('height', 150) // temporary; will be resized dynamically
        .attr('x', (width - 300) / 2)
        .attr('y', (height - 150) / 2)
        .attr('rx', 15)
        .attr('ry', 15)
        .attr('fill', colors.surface)
        .attr('stroke', colors.primary)
        .attr('stroke-width', 2);

    // Sub-group to hold text so we measure only the text BBox
    const modalTextGroup = modal.append('g')
        .attr('class', 'modal-text-group');

    // Modal title
    const modalTitle = modalTextGroup.append('text')
        .attr('font-size', '22px')
        .attr('font-weight', 'bold')
        .attr('fill', colors.text.primary)
        // Place the title at (0, 0) inside the group
        .attr('x', 0)
        .attr('y', 0);

    // Modal content
    const modalContent = modalTextGroup.append('text')
        .attr('font-size', '16px')
        .attr('fill', colors.text.secondary)
        // Place the content a bit lower so it doesn't overlap the title
        .attr('x', 0)
        .attr('y', 40);

    // Close button group
    const closeButton = modal.append('g')
        .attr('cursor', 'pointer')
        .on('click', closeModal);
        
    closeButton.append('circle')
        .attr('r', 15)
        .attr('fill', colors.divider);

    closeButton.append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', '20px')
        .attr('fill', colors.text.primary)
        .attr('pointer-events', 'none')
        .text('×');

    // Draw edges
    const linkGroup = g.append('g');
    const link = linkGroup.selectAll('path')
        .data(data.edges)
        .join('path')
        .attr('class', 'relation-link')
        .attr('marker-end', 'url(#arrowhead)')
        .style('stroke', colors.secondary)
        .style('stroke-width', 2)
        .style('stroke-dasharray', '5,5')
        .style('fill', 'none')
        .style('opacity', 0);

    // Create a group for each node
    const node = g.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', 'concept-node')
        .style('opacity', d => d.id === 'originalTable' ? 1 : 0)  // Initially hide split tables
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended)
        )
        .on('click', showModal);

    // Draw node backgrounds
    node.append('rect')
        .attr('width', d => d.id === 'originalTable' ? 280 : 220)
        .attr('height', d => {
            // Add a bit of extra padding at the bottom
            const baseHeight = 40;
            const propHeight = d.properties ? d.properties.length * 24 : 0;
            return baseHeight + propHeight + 10; // +10 for bottom padding
        })
        .attr('rx', 8)
        .attr('ry', 8)
        .style('fill', d => d.id === 'originalTable' ? '#2D2D2D' : colors.surface)
        .style('stroke', d => d.id === 'originalTable' ? colors.primary : colors.secondary)
        .style('stroke-width', 2);

    // Add table content
    node.each(function(d) {
        const conceptNode = d3.select(this);
        let yOffset = 25;

        // Table name header
        conceptNode.append('rect')
            .attr('width', d.id === 'originalTable' ? 280 : 220)
            .attr('height', 30)
            .attr('rx', 8)
            .attr('ry', 8)
            .style('fill', d => d.id === 'originalTable' ? colors.origT1 : colors.origT2)
            .style('opacity', 0.8);

        // Node name in bold
        conceptNode.append('text')
            .attr('x', 10)
            .attr('y', yOffset)
            .attr('fill', colors.text.primary)
            .attr('font-weight', 'bold')
            .attr('font-size', '14px')
            .text(d.name);

        yOffset += 40;

        // Node properties in table-like format
        if (d.properties) {
            d.properties.forEach((prop, index) => {
                // Alternating row background
                if (index % 2 === 0) {
                    conceptNode.append('rect')
                        .attr('width', d.id === 'originalTable' ? 280 : 220)
                        .attr('height', 24)
                        .attr('y', yOffset - 18)
                        .style('fill', colors.divider)
                        .style('opacity', 0.5);
                }
                
                conceptNode.append('text')
                    .attr('x', 15)
                    .attr('y', yOffset)
                    .attr('fill', colors.text.secondary)
                    .attr('font-size', '12px')
                    .text(prop);
                yOffset += 24;
            });
        }
    });

    // Modal handling
    let isModalOpen = false;
    let animationTimer = null;

    // Animation state
    let state = 'combined';

    function showModal(_, d) {
        // Pause animation
        clearTimeout(animationTimer);
        isModalOpen = true;

        // Make modal visible
        modal.style('opacity', 1).style('pointer-events', 'all');

        // Clear old text
        modalTitle.text('');
        modalContent.selectAll('tspan').remove();

        // Choose definition text based on current state
        let lines = [];
        if (state === 'split') {
            modalTitle.text(`${d.name} - Normalized Database`);
            lines = [
                'Normalization: Process to refine tables to minimize redundancy and eliminate anomalies.',
                'Benefits: Reduces redundancy, improves data integrity, and simplifies data maintenance.'
            ];
        } else {
            // state === 'combined'
            modalTitle.text(`${d.name} - Denormalized Database`);
            lines = [
                'Denormalization: Process of combining tables to optimize read performance.',
                'Trade-offs: Improves query speed, but increases data redundancy and update complexity.'
            ];
        }

        // Add multiline text with tspans
        // The content has its own y-offset (40) so it doesn't overlap the title
        lines.forEach((line, i) => {
            modalContent.append('tspan')
                .attr('x', 0) // relative to the content's x
                .attr('dy', i === 0 ? 0 : '1.5em')
                .text(line);
        });

        // Use a small timeout to ensure text is rendered before measuring
        setTimeout(() => {
            // Measure only the text sub-group so we don't include the rect in the bbox
            const textBBox = modalTextGroup.node().getBBox();

            const topPadding = 40;
            const bottomPadding = 10;
            const horizontalPadding = 20;  // if you want to keep the same horizontal padding
            const newModalWidth = textBBox.width + horizontalPadding * 2;
            const newModalHeight = textBBox.height + topPadding + bottomPadding;

            // Center the modalRect
            modalRect
                .attr('width', newModalWidth)
                .attr('height', newModalHeight)
                .attr('x', (width - newModalWidth) / 2)
                .attr('y', (height - newModalHeight) / 2);

            // Shift the text group so the text is inside the rectangle with padding
            modalTextGroup.attr('transform', `translate(${(width - newModalWidth) / 2 + horizontalPadding}, ${(height - newModalHeight) / 2 + topPadding})`);

            // Position the close button in the top-right corner of the rect
            closeButton.select('circle')
                .attr('cx', (width - newModalWidth) / 2 + newModalWidth - 15)
                .attr('cy', (height - newModalHeight) / 2 + 15);

            closeButton.select('text')
                .attr('x', (width - newModalWidth) / 2 + newModalWidth - 15)
                .attr('y', (height - newModalHeight) / 2 + 20);
        }, 0);
    }

    function closeModal() {
        // Hide modal
        modal.style('opacity', 0)
            .style('pointer-events', 'none');
        
        isModalOpen = false;
        
        // Resume animation if it was running
        if (state !== null) {
            animate();
        }
    }

    // Position nodes with fixed positions for stability
    data.nodes.forEach(d => {
        if (d.id === 'originalTable') {
            d.x = width / 2;
            d.y = height / 2;
            d.fx = width / 2;
            d.fy = height / 2;
        } else if (d.id === 'table1') {
            d.x = width / 3;
            d.y = 2 * height / 3;
        } else if (d.id === 'table2') {
            d.x = 2 * width / 3;
            d.y = 2 * height / 3;
        }
    });

    // On each simulation tick, position edges & nodes
    simulation.on('tick', () => {
        link.attr('d', d => {
            const sourceX = d.source.x;
            const sourceY = d.source.y;
            const targetX = d.target.x;
            const targetY = d.target.y;
            
            // Calculate path for curved arrows
            const dx = targetX - sourceX;
            const dy = targetY - sourceY;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
            
            return `M${sourceX},${sourceY}A${dr},${dr} 0 0,1 ${targetX},${targetY}`;
        });

        // Center each node rect around (d.x, d.y)
        node.attr('transform', d => {
            const nodeWidth = d.id === 'originalTable' ? 280 : 220;
            // 30 was your top offset for the text area
            return `translate(${d.x - nodeWidth / 2}, ${d.y - 30})`;
        });
    });

    // Drag behaviors with limits to prevent going off screen
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        // Limit dragging to stay within bounds
        const nodeWidth = d.id === 'originalTable' ? 280 : 220;
        d.fx = Math.max(nodeWidth / 2, Math.min(width - nodeWidth / 2, event.x));
        d.fy = Math.max(50, Math.min(height - 50, event.y));
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        // Keep fixed position for stability unless in animation
        if (state === null) {
            d.fx = null;
            d.fy = null;
        }
    }

    // Animation loop
    function animate() {
        if (isModalOpen) return;
        
        if (state === 'combined') {
            // Transition to split state
            splitTables();
            state = 'split';
        } else {
            // Transition to combined state
            combineTables();
            state = 'combined';
        }
        
        // Schedule next animation
        animationTimer = setTimeout(animate, 5000);
    }

    // Start animation cycle with a slight delay
    setTimeout(animate, 1500);

    // Function to visually split tables
    function splitTables() {
        // Show split tables
        node.transition()
            .duration(1000)
            .style('opacity', 1);
            
        // Show edges during split
        link.transition()
            .duration(1000)
            .style('opacity', 0.7);
        
        // Move tables to fixed split positions
        data.nodes.forEach(d => {
            if (d.id === 'originalTable') {
                d.fx = width / 2;
                d.fy = height / 3;
            } else if (d.id === 'table1') {
                d.fx = width / 3;
                d.fy = 2 * height / 3;
            } else if (d.id === 'table2') {
                d.fx = 2 * width / 3;
                d.fy = 2 * height / 3;
            }
        });
        
        // Update animation label
        g.selectAll('.animation-label').remove();
        g.append('text')
            .attr('class', 'animation-label')
            .attr('x', width / 2)
            .attr('y', 150)
            .attr('text-anchor', 'middle')
            .attr('font-size', '22px')    // Slightly larger
            .attr('font-weight', '600')   // Bolder
            .attr('fill', colors.primaryVariant) // A variant color
            .text('Normalizing: Splitting into related tables')
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .style('opacity', 1);
            
        // Restart simulation with low alpha for stability
        simulation.alpha(0.1).restart();
    }

    // Function to visually combine tables
    function combineTables() {
        // Hide split tables
        node.transition()
            .duration(1000)
            .style('opacity', d => d.id === 'originalTable' ? 1 : 0);
            
        // Hide edges during combine
        link.transition()
            .duration(1000)
            .style('opacity', 0);
            
        // Move tables to fixed combined position
        data.nodes.forEach(d => {
            d.fx = width / 2;
            d.fy = height / 2;
        });
        
        // Update animation label
        g.selectAll('.animation-label').remove();
        g.append('text')
            .attr('class', 'animation-label')
            .attr('x', width / 2)
            .attr('y', 150)
            .attr('text-anchor', 'middle')
            .attr('font-size', '22px')    // Slightly larger
            .attr('font-weight', '600')   // Bolder
            .attr('fill', colors.secondary) 
            .text('Denormalized: Combined into single table')
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .style('opacity', 1);
            
        // Restart simulation with low alpha for stability
        simulation.alpha(0.1).restart();
    }

    // Return the simulation reference
    return simulation;
};

// CommonJS export if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createNormalizationVisualization };
}
