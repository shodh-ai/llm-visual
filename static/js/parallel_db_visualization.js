// Parallel Database Visualization Code
const createParallelDBVisualization = (data) => {
    // Get container dimensions
    const container = d3.select('#visualization-container');
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    // Clear any existing SVG
    container.selectAll('*').remove();

    // Create SVG with zoom support
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Create a container for the zoomable content
    const g = svg.append('g');

    // Add arrow marker definition
    const defs = svg.append('defs');
    defs.append('marker')
        .attr('id', 'parallel-arrowhead')
        .attr('viewBox', '-10 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-10,-5L0,0L-10,5')
        .attr('fill', '#ef4444');

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges).id(d => d.id).distance(200))
        .force('charge', d3.forceManyBody().strength(-2000))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(100));

    // Create curved links
    const link = g.append('g')
        .selectAll('path')
        .data(data.edges)
        .join('path')
        .attr('class', 'relationship-link')
        .attr('marker-end', 'url(#parallel-arrowhead)')
        .style('stroke', '#ef4444')
        .style('stroke-width', 2)
        .style('fill', 'none');

    // Create node containers
    const node = g.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', 'component-node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add rectangles for nodes
    node.append('rect')
        .attr('width', 200)
        .attr('height', d => {
            let height = 40; // Base height for name
            if (d.responsibilities) height += d.responsibilities.length * 20;
            if (d.properties) height += d.properties.length * 20;
            if (d.partitioning_schemes) height += d.partitioning_schemes.length * 20;
            return height + 20; // Extra padding
        })
        .attr('rx', 6)
        .attr('ry', 6)
        .style('fill', '#1f2937')
        .style('stroke', '#ef4444')
        .style('stroke-width', 2);

    // Add node content
    node.each(function(d) {
        const componentNode = d3.select(this);
        let yOffset = 25;

        // Add name
        componentNode.append('text')
            .attr('x', 10)
            .attr('y', yOffset)
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .attr('font-size', '14px')
            .text(d.name);

        yOffset += 25;

        // Add responsibilities
        if (d.responsibilities) {
            d.responsibilities.forEach(resp => {
                componentNode.append('text')
                    .attr('x', 15)
                    .attr('y', yOffset)
                    .attr('fill', '#9ca3af')
                    .attr('font-size', '12px')
                    .text(resp);
                yOffset += 20;
            });
        }

        // Add properties
        if (d.properties) {
            d.properties.forEach(prop => {
                componentNode.append('text')
                    .attr('x', 15)
                    .attr('y', yOffset)
                    .attr('fill', '#9ca3af')
                    .attr('font-size', '12px')
                    .text(prop);
                yOffset += 20;
            });
        }

        // Add partitioning schemes
        if (d.partitioning_schemes) {
            d.partitioning_schemes.forEach(scheme => {
                componentNode.append('text')
                    .attr('x', 15)
                    .attr('y', yOffset)
                    .attr('fill', '#9ca3af')
                    .attr('font-size', '12px')
                    .text(scheme);
                yOffset += 20;
            });
        }
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
        // Update link paths with curved lines
        link.attr('d', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
            return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        });

        // Update node positions
        node.attr('transform', d => `translate(${d.x - 100},${d.y - 30})`);
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
        d.fx = null;
        d.fy = null;
    }

    // Function to highlight nodes
    window.highlightNode = (nodeId) => {
        node.select('rect')
            .style('stroke', d => d.id === nodeId ? '#f87171' : '#ef4444')
            .style('stroke-width', d => d.id === nodeId ? 4 : 2);
    };

    // Function to reset highlights
    window.resetHighlights = () => {
        node.select('rect')
            .style('stroke', '#ef4444')
            .style('stroke-width', 2);
    };

    return simulation; // Return simulation for external control if needed
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createParallelDBVisualization };
}
