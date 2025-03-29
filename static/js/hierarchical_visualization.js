// Hierarchical Data Model Visualization
const createHierarchicalVisualization = (data) => {
    // Validate input data
    if (!data || !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0 ||
        !data.edges || !Array.isArray(data.edges)) {
        console.error('Invalid data format for hierarchical visualization');
        return;
    }
    // Get container dimensions
    const container = d3.select('#visualization-container');
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    const nodeWidth = 200;
    const nodeHeight = 140;
    const levelHeight = 180; // Vertical spacing between levels

    // Clear any existing SVG
    container.selectAll('*').remove();

    // Create SVG with zoom support
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 2])
        .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Create a container for the zoomable content
    const g = svg.append('g')
        .attr('transform', `translate(${width/2},50)`);

    // Create hierarchical layout starting with the root node
    const rootNode = data.nodes.find(n => n && n.id === 'root');
    if (!rootNode) {
        console.error('Root node not found in hierarchical data');
        return;
    }
    // Helper function to create hierarchy
    function createHierarchy(nodes, edges, parentId) {
        if (!nodes || !edges) return [];
        const children = nodes.filter(n => n && edges.some(e => e && e.source === parentId && e.target === n.id));
        return children.map(child => ({
            ...child,
            children: createHierarchy(nodes, edges, child.id)
        }));
    }

    // Create the hierarchy
    const hierarchy = d3.hierarchy(
        {
            ...rootNode,
            children: createHierarchy(data.nodes, data.edges, rootNode.id)
        },
        d => d.children
    );

    // Create tree layout
    const treeLayout = d3.tree()
        .nodeSize([nodeWidth + 60, levelHeight]);

    // Apply layout
    const root = treeLayout(hierarchy);

    // Create curved links
    // Create curved links
    const link = g.selectAll('.link')
        .data(root.links())
        .join('path')
        .attr('class', 'link')
        .attr('d', d => {
            const source = d.source;
            const target = d.target;
            const midY = (source.y + target.y) / 2;
            return `M${source.x},${source.y}
                    C${source.x},${midY}
                    ${target.x},${midY}
                    ${target.x},${target.y}`;
        })
        .style('fill', 'none')
        .style('stroke', '#3b82f6')
        .style('stroke-width', '2px')
        .style('stroke-opacity', 0.8);

    // Create node containers
    const node = g.selectAll('.node')
        .data(root.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);

    // Add node rectangles
    node.append('rect')
        .attr('x', -nodeWidth/2)
        .attr('y', -nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', 10)
        .attr('ry', 10)
        .style('fill', d => {
            switch(d.data.type) {
                case 'root': return '#2563eb';
                case 'branch': return '#3b82f6';
                default: return '#60a5fa';
            }
        })
        .style('stroke', '#60a5fa')
        .style('stroke-width', '2px');

    // Add node headers
    node.append('rect')
        .attr('x', -nodeWidth/2)
        .attr('y', -nodeHeight/2)
        .attr('width', nodeWidth)
        .attr('height', 30)
        .attr('rx', 10)
        .attr('ry', 10)
        .style('fill', d => {
            switch(d.data.type) {
                case 'root': return '#1e40af';
                case 'branch': return '#1d4ed8';
                default: return '#2563eb';
            }
        });

    // Add node titles
    node.append('text')
        .attr('x', 0)
        .attr('y', -nodeHeight/2 + 20)
        .attr('text-anchor', 'middle')
        .style('fill', 'white')
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .text(d => d.data.name);

    // Add node properties
    node.each(function(d) {
        const properties = d.data.properties || [];
        const nodeGroup = d3.select(this);
        
        properties.forEach((prop, i) => {
            nodeGroup.append('text')
                .attr('x', -nodeWidth/2 + 10)
                .attr('y', -nodeHeight/2 + 50 + i * 20)
                .style('fill', 'white')
                .style('font-size', '12px')
                .text(prop);
        });
    });

    // Add relationship labels
    link.each(function(d) {
        const relationship = data.edges.find(e => 
            e.source === d.source.data.id && 
            e.target === d.target.data.id
        );
        
        if (relationship) {
            const path = d3.select(this);
            const pathNode = path.node();
            const midpoint = pathNode.getPointAtLength(pathNode.getTotalLength() * 0.5);
            
            g.append('text')
                .attr('x', midpoint.x)
                .attr('y', midpoint.y - 10)
                .attr('text-anchor', 'middle')
                .style('fill', '#1e40af')
                .style('font-weight', 'bold')
                .style('font-size', '12px')
                .text(relationship.description);
        }
    });

    // Center the visualization
    const bounds = g.node().getBBox();
    const scale = Math.min(
        width / bounds.width,
        height / bounds.height
    ) * 0.9;
    
    const transform = d3.zoomIdentity
        .translate(
            width/2 - (bounds.x + bounds.width/2) * scale,
            height/2 - (bounds.y + bounds.height/2) * scale
        )
        .scale(scale);
    
    svg.call(zoom.transform, transform);

    // Function to create hierarchy from flat data
    function createHierarchy(nodes, edges, parentId) {
        const nodeMap = new Map(nodes.map(n => [n.id, {...n, children: []}]));
        const children = [];
        
        edges.forEach(edge => {
            if (edge.source === parentId) {
                const child = nodeMap.get(edge.target);
                if (child) {
                    child.children = createHierarchy(nodes, edges, child.id);
                    children.push(child);
                }
            }
        });
        
        return children;
    }

    // Highlight functions
    window.highlightNode = (nodeId) => {
        node.select('rect')
            .style('stroke', d => d.data.id === nodeId ? '#f87171' : '#60a5fa')
            .style('stroke-width', d => d.data.id === nodeId ? '4px' : '2px');

        link
            .style('stroke', d => 
                d.source.data.id === nodeId || d.target.data.id === nodeId ? 
                '#f87171' : '#3b82f6')
            .style('stroke-width', d => 
                d.source.data.id === nodeId || d.target.data.id === nodeId ? 
                '4px' : '2px');
    };

    window.resetHighlights = () => {
        node.select('rect')
            .style('stroke', '#60a5fa')
            .style('stroke-width', '2px');

        link
            .style('stroke', '#3b82f6')
            .style('stroke-width', '2px');
    };

    return root;
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createHierarchicalVisualization };
}
