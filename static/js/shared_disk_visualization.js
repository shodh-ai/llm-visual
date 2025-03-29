/**
 * Shared Disk Visualization Component
 * 
 * This is a simple visualization component for the shared disk architecture.
 */

// Create the component
function SharedDiskVisualization(props) {
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
    }, 'Shared Disk Architecture'),
    
    // Description
    React.createElement('p', {
      key: 'description',
      style: {
        marginBottom: '20px',
        fontSize: '16px',
        lineHeight: '1.5'
      }
    }, 'In a shared disk architecture, multiple database servers have their own memory but share access to common disk storage. This allows for better scalability while maintaining data consistency.'),
    
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
          
          // Draw disk storage
          const diskStorage = svg.append('rect')
            .attr('x', width / 2 - 100)
            .attr('y', height - 100)
            .attr('width', 200)
            .attr('height', 60)
            .attr('rx', 5)
            .attr('ry', 5)
            .style('fill', '#c2f0c2')
            .style('stroke', '#5cb85c')
            .style('stroke-width', 2);
          
          // Add disk label
          svg.append('text')
            .attr('x', width / 2)
            .attr('y', height - 70)
            .attr('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .text('Shared Disk Storage');
          
          // Draw servers
          const servers = [
            { id: 'server1', x: width / 4, y: height / 3, label: 'Server 1' },
            { id: 'server2', x: width / 2, y: height / 3, label: 'Server 2' },
            { id: 'server3', x: 3 * width / 4, y: height / 3, label: 'Server 3' }
          ];
          
          // Add servers
          servers.forEach(server => {
            // Server rectangle
            svg.append('rect')
              .attr('x', server.x - 40)
              .attr('y', server.y - 30)
              .attr('width', 80)
              .attr('height', 60)
              .attr('rx', 5)
              .attr('ry', 5)
              .style('fill', '#d9edf7')
              .style('stroke', '#31708f')
              .style('stroke-width', 2);
            
            // Server label
            svg.append('text')
              .attr('x', server.x)
              .attr('y', server.y + 5)
              .attr('text-anchor', 'middle')
              .style('font-weight', 'bold')
              .text(server.label);
            
            // Memory for each server
            svg.append('rect')
              .attr('x', server.x - 30)
              .attr('y', server.y - 20)
              .attr('width', 60)
              .attr('height', 15)
              .style('fill', '#b3e0ff')
              .style('stroke', '#0099cc')
              .style('stroke-width', 1);
            
            svg.append('text')
              .attr('x', server.x)
              .attr('y', server.y - 10)
              .attr('text-anchor', 'middle')
              .style('font-size', '10px')
              .text('Memory');
            
            // Connection line to disk
            svg.append('line')
              .attr('x1', server.x)
              .attr('y1', server.y + 30)
              .attr('x2', width / 2)
              .attr('y2', height - 100)
              .style('stroke', '#666')
              .style('stroke-width', 2)
              .style('stroke-dasharray', '5,5');
          });
          
          // Add animation
          function animateData() {
            // Random server
            const randomServer = servers[Math.floor(Math.random() * servers.length)];
            
            // Data packet
            const packet = svg.append('circle')
              .attr('r', 8)
              .style('fill', '#ff5555')
              .style('opacity', 0.8);
            
            // Randomly choose direction (read or write)
            const isRead = Math.random() > 0.5;
            
            if (isRead) {
              // Read operation (disk to server)
              packet
                .attr('cx', width / 2)
                .attr('cy', height - 100)
                .transition()
                .duration(1000)
                .attr('cx', randomServer.x)
                .attr('cy', randomServer.y + 30)
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();
            } else {
              // Write operation (server to disk)
              packet
                .attr('cx', randomServer.x)
                .attr('cy', randomServer.y + 30)
                .transition()
                .duration(1000)
                .attr('cx', width / 2)
                .attr('cy', height - 100)
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();
            }
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
window.SharedDiskVisualization = SharedDiskVisualization;
console.log('Shared Disk Visualization component loaded'); 