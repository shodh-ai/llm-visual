// Database Schema Visualization Code
const createSchemaVisualization = (data) => {
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

    // Add arrow marker definition for relationships
    const defs = svg.append('defs');
    defs.append('marker')
        .attr('id', 'schema-arrowhead')
        .attr('viewBox', '-10 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M-10,-5L0,0L-10,5')
        .attr('fill', '#3b82f6'); // Blue color for relationships

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges).id(d => d.id).distance(300))
        .force('charge', d3.forceManyBody().strength(-2000))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(150));

    // Create curved links with relationship types
    const link = g.append('g')
        .selectAll('g')
        .data(data.edges)
        .join('g')
        .attr('class', 'relationship');

    // Add paths for relationships
    link.append('path')
        .attr('class', 'relationship-path')
        .attr('marker-end', 'url(#schema-arrowhead)')
        .style('stroke', '#3b82f6')
        .style('stroke-width', 2)
        .style('fill', 'none');

    // Add relationship labels
    link.append('text')
        .attr('class', 'relationship-label')
        .attr('dy', -5)
        .attr('fill', '#3b82f6')
        .attr('font-size', '12px')
        .append('textPath')
        .attr('href', (d, i) => '#relationship-path-' + i)
        .attr('startOffset', '50%')
        .style('text-anchor', 'middle')
        .text(d => d.type);

    // Create node containers for tables
    const node = g.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', 'table-node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add table rectangles
    node.append('rect')
        .attr('width', 250)
        .attr('height', d => {
            const headerHeight = 40;
            const rowHeight = 25;
            const columns = d.columns || [];
            return headerHeight + (columns.length * rowHeight) + 10;
        })
        .attr('rx', 6)
        .attr('ry', 6)
        .style('fill', '#1f2937')
        .style('stroke', '#3b82f6')
        .style('stroke-width', 2);

    // Add table headers
    node.append('rect')
        .attr('width', 250)
        .attr('height', 40)
        .attr('rx', 6)
        .attr('ry', 6)
        .style('fill', '#3b82f6');

    // Add table names
    node.append('text')
        .attr('x', 125)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .attr('font-size', '16px')
        .text(d => d.name);

    // Add column containers
    const columns = node.append('g')
        .attr('class', 'columns')
        .attr('transform', 'translate(0, 40)');

    // Add column rows
    columns.each(function(d) {
        const columnGroup = d3.select(this);
        const columnData = d.columns || [];

        columnData.forEach((column, i) => {
            const row = columnGroup.append('g')
                .attr('transform', `translate(0, ${i * 25})`);

            // Column name
            row.append('text')
                .attr('x', 10)
                .attr('y', 17)
                .attr('fill', 'white')
                .attr('font-size', '14px')
                .text(column.name);

            // Column type
            row.append('text')
                .attr('x', 240)
                .attr('y', 17)
                .attr('text-anchor', 'end')
                .attr('fill', '#9ca3af')
                .attr('font-size', '12px')
                .text(column.type);

            // Primary key indicator
            if (column.isPrimary) {
                row.append('text')
                    .attr('x', 15)
                    .attr('y', 17)
                    .attr('fill', '#fbbf24')
                    .attr('font-size', '14px')
                    .text('🔑');
            }

            // Foreign key indicator
            if (column.isForeign) {
                row.append('text')
                    .attr('x', 15)
                    .attr('y', 17)
                    .attr('fill', '#34d399')
                    .attr('font-size', '14px')
                    .text('🔗');
            }
        });
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
        // Update link paths
        link.select('path')
            .attr('id', (d, i) => 'relationship-path-' + i)
            .attr('d', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });

        // Update node positions
        node.attr('transform', d => `translate(${d.x - 125},${d.y - 100})`);
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

    // Function to highlight tables and their relationships
    window.highlightTable = (tableId) => {
        // Highlight the selected table
        node.select('rect')
            .style('stroke', d => d.id === tableId ? '#f87171' : '#3b82f6')
            .style('stroke-width', d => d.id === tableId ? 4 : 2);

        // Highlight related links
        link.select('path')
            .style('stroke', d => 
                d.source.id === tableId || d.target.id === tableId ? 
                '#f87171' : '#3b82f6')
            .style('stroke-width', d => 
                d.source.id === tableId || d.target.id === tableId ? 
                4 : 2);

        // Highlight relationship labels
        link.select('text')
            .attr('fill', d => 
                d.source.id === tableId || d.target.id === tableId ? 
                '#f87171' : '#3b82f6');
    };

    // Function to reset highlights
    window.resetHighlights = () => {
        node.select('rect')
            .style('stroke', '#3b82f6')
            .style('stroke-width', 2);

        link.select('path')
            .style('stroke', '#3b82f6')
            .style('stroke-width', 2);

        link.select('text')
            .attr('fill', '#3b82f6');
    };

    return simulation;
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSchemaVisualization };
}
