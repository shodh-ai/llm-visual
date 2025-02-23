import React, { useState, useEffect, useRef } from 'react';
import ERVisualization from './ERVisualization';
import DocumentVisualization from './DocumentVisualization';
import HierarchicalVisualization from './HierarchicalVisualization';

const App = () => {
    const [topic, setTopic] = useState('');
    const [data, setData] = useState(null);
    const visualizationRef = useRef(null);

    useEffect(() => {
        if (!topic) return;

        fetch(`/api/visualization`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic })
        })
        .then(async response => {
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            return response.json();
        })
        .then(data => setData(data))
        .catch(error => {
            console.error('Error loading visualization:', error);
            setData(null);
        });
    }, [topic]);

    const handleTopicChange = (e) => {
        setTopic(e.target.value);
    };

    const handleNodeClick = (node) => {
        console.log('Clicked:', node);
        if (visualizationRef.current?.highlightNode) {
            visualizationRef.current.highlightNode(node.id);
            setTimeout(() => {
                visualizationRef.current?.resetHighlights();
            }, 2000);
        }
    };

    const renderVisualization = () => {
        if (!data) return null;

        const props = {
            data,
            onNodeClick: handleNodeClick,
            ref: visualizationRef
        };

        switch (topic) {
            case 'er':
                return <ERVisualization {...props} />;
            case 'document':
                return <DocumentVisualization {...props} />;
            case 'hierarchical':
                return <HierarchicalVisualization {...props} />;
            default:
                return <div>Visualization type not supported yet</div>;
        }
    };

    return (
        <div className="app-container">
            <div className="controls">
                <select value={topic} onChange={handleTopicChange}>
                    <option value="">Select a visualization</option>
                    <option value="er">Entity-Relationship Model</option>
                    <option value="document">Document Model</option>
                    <option value="hierarchical">Hierarchical Model</option>
                </select>
            </div>
            <div className="content-container">
                <div className="visualization-container">
                    {renderVisualization()}
                </div>
                {data?.narration && (
                    <div className="narration-container">
                        <h3>Narration</h3>
                        <div className="narration-text">
                            {data.narration}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .app-container {
                    padding: 20px;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background-color: #f8fafc;
                }
                .controls {
                    margin-bottom: 20px;
                    text-align: center;
                }
                .content-container {
                    flex: 1;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                }
                .visualization-container {
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                }
                .narration-container {
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    padding: 20px;
                    overflow-y: auto;
                }
                .narration-container h3 {
                    margin-top: 0;
                    color: #1e40af;
                    font-size: 1.2rem;
                    margin-bottom: 1rem;
                }
                .narration-text {
                    color: #374151;
                    line-height: 1.6;
                    font-size: 1rem;
                    white-space: pre-wrap;
                }
            `}</style>
        </div>
    );
};

export default App;
