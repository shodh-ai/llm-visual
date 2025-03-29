// Document Database Visualization Component
const DocumentVisualization = (props) => {
  const { data } = props;
  
  // Extract entities and relationships from the data
  const entities = data.entities || data.nodes || (data.data && data.data.entities) || [];
  const relationships = data.relationships || data.links || data.edges || (data.data && data.data.relationships) || [];
  
  return (
    <div className="document-visualization">
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Document Database Visualization</h3>
      
      <div className="visualization-content">
        <div className="entities-section">
          <h4>Collections</h4>
          <div className="entities-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {entities.map((entity, index) => (
              <div 
                key={`entity-${index}`}
                className="entity-card"
                style={{
                  padding: '15px',
                  backgroundColor: '#69b3a2',
                  color: 'white',
                  borderRadius: '5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  minWidth: '200px',
                  maxWidth: '300px'
                }}
              >
                <h4 style={{ marginTop: 0 }}>{entity.name || entity.id || 'Collection'}</h4>
                <p><strong>Type:</strong> {entity.type || 'Document'}</p>
                <p><strong>ID:</strong> {entity.id || 'Unknown'}</p>
                {entity.attributes && (
                  <div>
                    <p><strong>Fields:</strong></p>
                    <ul style={{ paddingLeft: '20px' }}>
                      {entity.attributes.map((attr, i) => (
                        <li key={i}>{attr.name || attr}: {attr.type || 'field'}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="relationships-section" style={{ marginTop: '20px' }}>
          <h4>Relationships</h4>
          <div className="relationships-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {relationships.map((rel, index) => (
              <div 
                key={`rel-${index}`}
                className="relationship-card"
                style={{
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '5px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  minWidth: '150px'
                }}
              >
                <p><strong>From:</strong> {rel.source}</p>
                <p><strong>To:</strong> {rel.target}</p>
                <p><strong>Type:</strong> {rel.type || 'Reference'}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Add a JSON view of the data for debugging */}
        <div className="data-debug" style={{ marginTop: '30px' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View Raw Data</summary>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '5px',
              maxHeight: '200px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
};

// Make the component available to the window object
window.DocumentVisualization = DocumentVisualization; 