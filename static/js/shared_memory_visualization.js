/**
 * Shared Memory Visualization Component
 * 
 * This is a simple visualization component for the shared memory architecture.
 */

// Create the component
function SharedMemoryVisualization(props) {
  const data = props.data || {};
  
  // Create the component using React
  return React.createElement('div', {
    style: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #ddd',
      maxWidth: '100%',
      margin: '0 auto'
    }
  }, [
    // Title
    React.createElement('h2', {
      key: 'title',
      style: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '20px'
      }
    }, 'Shared Memory Architecture'),
    
    // Description
    React.createElement('p', {
      key: 'description',
      style: {
        marginBottom: '20px',
        fontSize: '16px',
        lineHeight: '1.5'
      }
    }, 'In a shared memory architecture, multiple processors share a common memory space. This allows for efficient communication between processors through shared variables.'),
    
    // Visualization container
    React.createElement('div', {
      key: 'visualization',
      style: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px'
      },
      ref: (el) => {
        if (el && !el.hasChildNodes()) {
          // Create SVG visualization using D3
          const width = 600;
          const height = 400;
          
          const svg = d3.select(el)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('background-color', '#fff')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px');
          
          // Draw memory block
          const memoryBlock = svg.append('rect')
            .attr('x', width / 2 - 100)
            .attr('y', height / 2 - 50)
            .attr('width', 200)
            .attr('height', 100)
            .attr('rx', 5)
            .attr('ry', 5)
            .style('fill', '#b3e0ff')
            .style('stroke', '#0099cc')
            .style('stroke-width', 2);
          
          // Add memory label
          svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2 + 5)
            .attr('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .text('Shared Memory');
          
          // Draw processors
          const processors = [
            { id: 'cpu1', x: width / 4, y: height / 4, label: 'CPU 1' },
            { id: 'cpu2', x: width / 2, y: height / 4, label: 'CPU 2' },
            { id: 'cpu3', x: 3 * width / 4, y: height / 4, label: 'CPU 3' }
          ];
          
          // Add processors
          processors.forEach(proc => {
            // Processor circle
            svg.append('circle')
              .attr('cx', proc.x)
              .attr('cy', proc.y)
              .attr('r', 30)
              .style('fill', '#ffcc99')
              .style('stroke', '#ff9933')
              .style('stroke-width', 2);
            
            // Processor label
            svg.append('text')
              .attr('x', proc.x)
              .attr('y', proc.y + 5)
              .attr('text-anchor', 'middle')
              .style('font-weight', 'bold')
              .text(proc.label);
            
            // Connection line to memory
            svg.append('line')
              .attr('x1', proc.x)
              .attr('y1', proc.y + 30)
              .attr('x2', width / 2)
              .attr('y2', height / 2 - 50)
              .style('stroke', '#666')
              .style('stroke-width', 2)
              .style('stroke-dasharray', '5,5');
          });
          
          // Add animation
          function animateData() {
            // Data packet
            const packet = svg.append('circle')
              .attr('r', 8)
              .style('fill', '#ff5555')
              .style('opacity', 0.8);
            
            // Random processor
            const randomProc = processors[Math.floor(Math.random() * processors.length)];
            
            // Animate from processor to memory
            packet
              .attr('cx', randomProc.x)
              .attr('cy', randomProc.y + 30)
              .transition()
              .duration(1000)
              .attr('cx', width / 2)
              .attr('cy', height / 2 - 50)
              .transition()
              .duration(500)
              .style('opacity', 0)
              .remove();
          }
          
          // Start animation
          setInterval(animateData, 2000);
        }
      }
    }),
    
    // Data display
    React.createElement('div', {
      key: 'data',
      style: {
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#eee',
        borderRadius: '4px',
        maxHeight: '200px',
        overflow: 'auto'
      }
    }, [
      React.createElement('h3', { key: 'data-title' }, 'Visualization Data:'),
      React.createElement('pre', { key: 'data-content' }, JSON.stringify(data, null, 2))
    ])
  ]);
}

// Expose the component to the window
window.SharedMemoryVisualization = SharedMemoryVisualization;
 