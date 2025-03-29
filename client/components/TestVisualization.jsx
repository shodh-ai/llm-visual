import React from 'react';

const TestVisualization = React.forwardRef((props, ref) => {
    const { data, onNodeClick } = props;

    return (
        <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '24px',
            color: '#4299e1'
        }}>
            {data.nodes.length} Nodes and {data.edges.length} Edges
        </div>
    );
});

export default TestVisualization;
