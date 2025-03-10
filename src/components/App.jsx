import React, { useState, useRef, useEffect } from 'react';
import DoubtBox from './DoubtBox';
import ERVisualization from './ERVisualization';
import DocumentVisualization from './DocumentVisualization';
import HierarchicalVisualization from './HierarchicalVisualization';
import EntityVisualization from './EntityVisualization';
import AttributeVisualization from './AttributeVisualization';
import SharedMemoryVisualization from './Shared_memoryVisualization';
import SharedDiskVisualization from './Shared_diskVisualization';
import SharedNothingVisualization from './Shared_nothingVisualization';
import DistributedDatabaseVisualization from './Distributed_databaseVisualization';
import OOPConceptsVisualization from './Oop_conceptsVisualization';
import RelationalQueryVisualization from './RelationalqueryVisualization';
import NormalFormVisualization from './NormalizationVisualization';
import ActiveDBVisualization from './ActivedbVisualization';
import QueryProcessingVisualization from './QueryprocessingVisualization';
import MobiledbVisualization from './MobiledbVisualization';
import GISVisualization from './GisVisualization';
import PESTELVisualization from './PESTELVisualization';
import PortersfiveforcesVisualization from './PortersfiveforcesVisualization';
import SWOTVisualization from './SWOTVisualization';
import IndustryLifeCycleVisualization from './IndustrylifecycleVisualization';
import MarketStructuresVisualization from './MarketstructuresVisualization';
import StrategicIntentVisualization from './StrategicintentVisualization';
import VisualizationController from './VisualizationController';

// Define the VISUALIZATIONS object
const VISUALIZATIONS = {
    er: ERVisualization,
    document: DocumentVisualization,
    hierarchical: HierarchicalVisualization,
    entity: EntityVisualization,
    attribute: AttributeVisualization,
    shared_memory: SharedMemoryVisualization,
    shared_disk: SharedDiskVisualization,
    shared_nothing: SharedNothingVisualization,
    distributed_database: DistributedDatabaseVisualization,
    oop_concepts: OOPConceptsVisualization,
    relationalQuery: RelationalQueryVisualization,
    normalization: NormalFormVisualization,
    activedb: ActiveDBVisualization,
    queryprocessing: QueryProcessingVisualization,
    mobiledb: MobiledbVisualization,
    gis: GISVisualization,
    pestel: PESTELVisualization,
    portersfiveforces: PortersfiveforcesVisualization,
    swot: SWOTVisualization,
    industrylifecycle: IndustryLifeCycleVisualization,
    marketstructures: MarketStructuresVisualization,
    strategicintent: StrategicIntentVisualization
};

const App = () => {
    const [topic, setTopic] = useState(null);
    const [data, setData] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [animationStates, setAnimationStates] = useState([]);
    const [activeHighlights, setActiveHighlights] = useState(new Set());
    const [isPlaying, setIsPlaying] = useState(false);
    const [narration, setNarration] = useState('');
    const [isProcessingDoubt, setIsProcessingDoubt] = useState(false);
    const visualizationRef = useRef(null);
    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!topic) return;
        
        setLoading(true);
        setError(null);

        fetch(`/api/visualization`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic })
        })
        .then(response => response.json())
        .then(result => {
            setData(result);
            setLoading(false);
        })
        .catch(err => {
            setError(err.message);
            setLoading(false);
        });
    }, [topic]);

    const handleTopicChange = (e) => {
        setTopic(e.target.value);
    };

    const handleDoubtSubmit = async (doubt) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/process-doubt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ doubt, topic }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to process doubt');
            }
            
            const result = await response.json();
            // Extract the narration text from the response
            const narrationText = typeof result.narration === 'string' 
                ? result.narration 
                : result.narration?.explanation || 'No explanation available';
            
            setNarration(narrationText);
            if (result.highlightedElements) {
                setActiveHighlights(new Set(result.highlightedElements));
            }
        } catch (err) {
            setError('Failed to process your doubt. Please try again.');
            console.error('Error processing doubt:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNodeClick = (nodeId) => {
        console.log('Clicked node:', nodeId);
        if (visualizationRef.current?.highlightNode) {
            visualizationRef.current.highlightNode(nodeId);
            setTimeout(() => {
                visualizationRef.current?.resetHighlights();
            }, 2000);
        }
    };

    const updateHighlights = (time) => {
        if (!data?.narration_timestamps) {
            console.log('No narration timestamps available for highlighting');
            return;
        }
        
        // Reset all highlights first
        visualizationRef.current?.resetHighlights();

        // Find current narration segment
        const currentSegment = data.narration_timestamps.find(segment => 
            time >= segment.start_time && time <= segment.end_time
        );

        console.log('Current time:', time, 'Current segment:', currentSegment);

        if (currentSegment) {
            // Handle both single node_id and array of node_ids
            const nodeIds = currentSegment.node_ids || 
                          (currentSegment.node_id ? [currentSegment.node_id] : []);

            console.log('Highlighting nodes:', nodeIds);

            // Apply highlights to current nodes
            nodeIds.forEach(nodeId => {
                if (nodeId) {
                    visualizationRef.current?.highlightNode(nodeId);
                }
            });
            setActiveHighlights(new Set(nodeIds));
        } else {
            console.log('No active segment found for time:', time);
            setActiveHighlights(new Set());
        }
    };

    const animate = () => {
        if (!isPlaying) {
            console.log('Animation stopped - not playing');
            return;
        }
        
        const timestamps = data?.narration_timestamps;
        if (!timestamps?.length) {
            console.log('No narration timestamps available');
            setIsPlaying(false);
            return;
        }
        
        const now = Date.now();
        const elapsed = now - startTimeRef.current;
        console.log('Current time:', elapsed, 'ms');

        // Update current time
        setCurrentTime(elapsed);

        // Find current word timing
        const currentTiming = timestamps.find(timing => 
            elapsed >= timing.start_time && elapsed <= timing.end_time
        );

        if (currentTiming) {
            // Update highlights based on current timing
            if (visualizationRef.current?.highlightNode) {
                visualizationRef.current.resetHighlights();
                currentTiming.node_ids.forEach(nodeId => {
                    visualizationRef.current.highlightNode(nodeId);
                });
            }
        }

        // Check if animation should end
        const lastTiming = timestamps[timestamps.length - 1];
        if (elapsed > lastTiming.end_time) {
            setIsPlaying(false);
            if (visualizationRef.current?.resetHighlights) {
                visualizationRef.current.resetHighlights();
            }
            return;
        }

        // Continue animation
        timerRef.current = requestAnimationFrame(animate);
        if (elapsed >= lastSegment.end_time) {
            console.log('Animation complete');
            setIsPlaying(false);
            setCurrentTime(lastSegment.end_time);
            updateHighlights(lastSegment.end_time);
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
            return;
        }

        setCurrentTime(elapsed);
        updateHighlights(elapsed);
        timerRef.current = requestAnimationFrame(animate);
    };

    // Effect to update highlights when currentTime changes
    useEffect(() => {
        if (data?.narration_timestamps) {
            updateHighlights(currentTime);
        }
    }, [currentTime, data]);

    const handlePlayPause = () => {
        console.log('Play/Pause clicked, current state:', isPlaying);
        if (isPlaying) {
            // Pause animation
            console.log('Pausing animation');
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
            setIsPlaying(false);
        } else {
            // Start/resume animation
            console.log('Starting animation');
            startTimeRef.current = Date.now() - currentTime;
            setIsPlaying(true);
            animate(); // Start animation
        }
    };

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
        };
    }, []);

    // Reset animation when topic changes
    useEffect(() => {
        setCurrentTime(0);
        setIsPlaying(false);
        if (timerRef.current) {
            cancelAnimationFrame(timerRef.current);
        }
    }, [topic]);

    useEffect(() => {
        if (data?.narration_timestamps) {
            // Reset animation when data changes
            setCurrentTime(0);
            setIsPlaying(false);
            if (timerRef.current) {
                cancelAnimationFrame(timerRef.current);
            }
        }
    }, [data]);

    const renderVisualization = () => {
        if (!data || !topic) return null;
        if (loading) return <div>Loading...</div>;
        if (error) return <div>Error: {error}</div>;

        // Use VisualizationController for shared memory and shared disk visualizations
        if (topic === 'shared_memory' || topic === 'shared_disk' || topic === 'shared_nothing') {
            return (
                <VisualizationController
                    visualizationComponent={VISUALIZATIONS[topic]}
                    data={data}
                    topic={topic}
                />
            );
        }

        // For other visualizations, use the existing rendering logic
        const VisualizationComponent = VISUALIZATIONS[topic];
        if (!VisualizationComponent) {
            return <div>Visualization type not supported</div>;
        }

        return (
            <div className="visualization-container">
                <VisualizationComponent
                    ref={visualizationRef}
                    data={{
                        nodes: data.nodes,
                        edges: data.edges
                    }}
                    activeHighlights={activeHighlights}
                    onNodeClick={handleNodeClick}
                />
                <div className="narration-controls">
                    <button onClick={handlePlayPause}>
                        {isPlaying ? 'Pause' : 'Play'} Animation
                    </button>
                    <div className="timer">{(currentTime / 1000).toFixed(1)}s</div>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container">
            <div className="controls">
                <select value={topic || ''} onChange={handleTopicChange}>
                    <option value="">Select a visualization</option>
                    <option value="er">Entity-Relationship Model</option>
                    <option value="document">Document Model</option>
                    <option value="hierarchical">Hierarchical Model</option>
                    <option value="entity">Entity Model</option>
                    <option value="attribute">Attribute Model</option>
                    <option value="shared_memory">Shared Memory Model</option>
                    <option value="shared_disk">Shared Disk Model</option>
                    <option value="shared_nothing">Shared Nothing Model</option>
                    <option value="distributed_database">Distributed Database Model</option>
                    <option value="oop_concepts">OOP Concepts Model</option>
                    <option value="relationalQuery">Relational Query Language</option> 
                    <option value="normalization">Normal Form Visualization</option>
                    <option value="activedb">Active Database Visualization</option>
                    <option value="queryprocessing">Query Processing Visualization</option>
                    <option value="mobiledb">Mobile Database Visualization</option>
                    <option value="gis">GISVisualization</option>
                    <option value="pestel">PESTEL Visualization</option>
                    <option value="portersfiveforces">Porters Five Forces Visualization</option>
                    <option value="swot">SWOT Analysis Visualization</option>
                    <option value="industrylifecycle">Industry life cycle Visualization</option>
                    <option value="marketstructures">Market Structures Visualization</option>
                    <option value="strategicintent">Strategic Intent Visualization</option>

                </select>
            </div>
            <div className="content-container">
                <div className="visualization-container">
                    {renderVisualization()}
                </div>
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
                }
                .visualization-container {
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    height: 100%;
                }
            `}</style>
        </div>
    );
};

export default App;