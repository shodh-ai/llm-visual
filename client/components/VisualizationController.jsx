import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';

const VisualizationController = ({ 
  visualizationComponent: VisualizationComponent,
  data,
  topic,
  onDoubtSubmit
}) => {
  const [highlightedElements, setHighlightedElements] = useState([]);
  const [narration, setNarration] = useState('');
  const [originalNarration, setOriginalNarration] = useState('');
  const [isOriginalNarration, setIsOriginalNarration] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [narrationTimestamps, setNarrationTimestamps] = useState([]);
  
  // Add new state for caching
  const [originalAudioUrl, setOriginalAudioUrl] = useState(null);
  const [originalTimestamps, setOriginalTimestamps] = useState([]);
  const [originalPlaybackPosition, setOriginalPlaybackPosition] = useState(0);
  
  // Add new state for enhanced features
  const [interactiveElements, setInteractiveElements] = useState([]);
  const [relatedConcepts, setRelatedConcepts] = useState([]);
  const [showingExample, setShowingExample] = useState(false);
  
  // Add state for AI-driven highlights
  const [aiHighlightedElements, setAiHighlightedElements] = useState([]);
  const [highlightHistory, setHighlightHistory] = useState([]);
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);
  
  const visualizationRef = useRef(null);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize narration from data prop
  useEffect(() => {
    if (data?.narration) {
      setNarration(data.narration);
      setOriginalNarration(data.narration);
      setIsOriginalNarration(true);
      
      // Check if we have cached audio for this narration
      const cachedAudioUrl = localStorage.getItem(`${topic}_audio_url`);
      const cachedWordTimings = localStorage.getItem(`${topic}_word_timings`);
      const cachedNarrationText = localStorage.getItem(`${topic}_narration_text`);

      if (cachedAudioUrl && cachedWordTimings && cachedNarrationText === data.narration) {
        console.log('Using cached audio file:', cachedAudioUrl);
        // Verify the cached audio file is still accessible
        fetch(cachedAudioUrl)
          .then(response => {
            if (response.ok) {
              setOriginalAudioUrl(cachedAudioUrl);
              setOriginalTimestamps(JSON.parse(cachedWordTimings));
              setAudioUrl(cachedAudioUrl);
              setNarrationTimestamps(JSON.parse(cachedWordTimings));
            } else {
              throw new Error('Cached audio file not accessible');
            }
          })
          .catch(error => {
            console.warn('Cached audio not available, generating new audio:', error);
            generateNarrationAudio(data.narration, true);
          });
      } else {
        // Generate new audio if no cache or narration text has changed
        generateNarrationAudio(data.narration, true);
      }
    }
    
    // Initialize highlighted elements from data if available
    if (data?.narration_timestamps) {
      // Extract node_id values from timestamps for initial highlighting
      const initialHighlights = data.narration_timestamps
        .filter(timestamp => timestamp.node_id)
        .map(timestamp => timestamp.node_id)
        .flat()
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
      
      if (initialHighlights.length > 0) {
        setHighlightedElements(initialHighlights);
        setHighlightHistory([{ time: 0, elements: initialHighlights }]);
      }
    }
  }, [data, topic]);

  const generateNarrationAudio = async (text, isOriginal = false) => {
    try {
      console.log('Generating audio for text:', text);
      const response = await fetch('/api/narration/' + topic, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Audio generation result:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.audio_url) {
        throw new Error('No audio URL returned from server');
      }

      // Test audio availability before setting URL
      try {
        const audioTest = await fetch(result.audio_url);
        if (!audioTest.ok) {
          throw new Error(`Audio file not accessible: ${audioTest.status}`);
        }
      } catch (error) {
        console.error('Audio file test failed:', error);
        throw new Error('Generated audio file is not accessible');
      }

      // Process word timings if available
      let wordTimings = [];
      if (result.word_timings) {
        wordTimings = result.word_timings;
        
        // Cache word timings
        if (isOriginal) {
          localStorage.setItem(`${topic}_word_timings`, JSON.stringify(wordTimings));
          localStorage.setItem(`${topic}_narration_text`, text);
        }
      }

      // Set state based on whether this is original or response narration
      if (isOriginal) {
        setOriginalAudioUrl(result.audio_url);
        setOriginalTimestamps(wordTimings);
        localStorage.setItem(`${topic}_audio_url`, result.audio_url);
      }
      
      setAudioUrl(result.audio_url);
      setNarrationTimestamps(wordTimings);
      
      // If we have node_id values in the word timings, prepare highlight history
      if (wordTimings.some(timing => timing.node_id)) {
        const highlightSequence = [];
        let lastTime = 0;
        let lastElements = [];
        
        wordTimings.forEach(timing => {
          if (timing.node_id) {
            const elements = Array.isArray(timing.node_id) ? timing.node_id : [timing.node_id];
            highlightSequence.push({
              time: timing.start_time,
              elements: elements
            });
            lastTime = timing.end_time;
            lastElements = elements;
          }
        });
        
        // Add final state
        if (highlightSequence.length > 0) {
          highlightSequence.push({
            time: lastTime + 1000, // Add 1 second after last highlight
            elements: []
          });
        }
        
        setHighlightHistory(highlightSequence);
        setCurrentHighlightIndex(0);
      }

      return result.audio_url;
    } catch (error) {
      console.error('Error generating narration audio:', error);
      throw error;
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      cancelAnimationFrame(animationFrameRef.current);
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        // Reset to beginning if at the end
        if (audioRef.current.ended) {
          audioRef.current.currentTime = 0;
          setCurrentTime(0);
          setCurrentHighlightIndex(0);
        }
        
        audioRef.current.play()
          .then(() => {
            animationFrameRef.current = requestAnimationFrame(updateHighlights);
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('Error playing audio:', error);
          });
      }
    }
  };

  const updateHighlights = () => {
    if (!audioRef.current || !isPlaying) return;
    
    const currentAudioTime = audioRef.current.currentTime * 1000; // Convert to ms
    setCurrentTime(currentAudioTime);
    
    // Update highlights based on current time
    if (highlightHistory.length > 0) {
      // Find the appropriate highlight for the current time
      let newIndex = currentHighlightIndex;
      
      // Check if we need to move forward in the highlight sequence
      while (
        newIndex < highlightHistory.length - 1 && 
        currentAudioTime >= highlightHistory[newIndex + 1].time
      ) {
        newIndex++;
      }
      
      // Check if we need to move backward (e.g., if user skipped back)
      while (
        newIndex > 0 && 
        currentAudioTime < highlightHistory[newIndex].time
      ) {
        newIndex--;
      }
      
      // Update highlight index and elements if changed
      if (newIndex !== currentHighlightIndex) {
        setCurrentHighlightIndex(newIndex);
        setHighlightedElements(highlightHistory[newIndex].elements);
      }
    }
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(updateHighlights);
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animationFrameRef.current);
    
    // Reset highlights
    setHighlightedElements([]);
  };

  const handleAudioError = (error) => {
    console.error('Audio playback error:', error);
    setIsPlaying(false);
    cancelAnimationFrame(animationFrameRef.current);
    
    // Try to regenerate audio if there was an error
    if (isOriginalNarration) {
      generateNarrationAudio(originalNarration, true)
        .catch(err => {
          console.error('Failed to regenerate audio after error:', err);
        });
    } else {
      generateNarrationAudio(narration, false)
        .catch(err => {
          console.error('Failed to regenerate audio after error:', err);
        });
    }
  };

  const handleRestoreOriginalNarration = () => {
    setNarration(originalNarration);
    setIsOriginalNarration(true);
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Restore original audio and timestamps
    setAudioUrl(originalAudioUrl);
    setNarrationTimestamps(originalTimestamps);
    
    // Reset highlights
    setHighlightedElements([]);
    setCurrentHighlightIndex(0);
  };

  const handleDoubtSubmission = async (doubt) => {
    if (!doubt.trim()) return;
    
    try {
      // Call the parent's doubt submission handler
      if (onDoubtSubmit) {
        // Pass current state information
        const currentState = {
          topic,
          doubt,
          currentTime,
          highlightedElements,
          isOriginalNarration
        };
        
        // Show loading state
        setNarration('Processing your question...');
        
        // Call the parent handler and wait for response
        const response = await onDoubtSubmit(doubt, currentState);
        
        if (response) {
          console.log('Received doubt response:', response);
          
          // Update narration with the response text
          if (response.narration) {
            setNarration(response.narration);
            setIsOriginalNarration(false);
          }
          
          // Process AI-driven highlights if available
          if (response.highlights && Array.isArray(response.highlights)) {
            setAiHighlightedElements(response.highlights);
            setHighlightedElements(response.highlights);
          }
          
          // Process narration timestamps if available
          if (response.narration_timestamps) {
            setNarrationTimestamps(response.narration_timestamps);
            
            // Build highlight history from timestamps
            if (response.narration_timestamps.some(ts => ts.node_id)) {
              const newHighlightHistory = [];
              let lastElements = [];
              
              response.narration_timestamps.forEach(timing => {
                if (timing.node_id) {
                  const elements = Array.isArray(timing.node_id) ? timing.node_id : [timing.node_id];
                  newHighlightHistory.push({
                    time: timing.start_time,
                    elements: elements
                  });
                  lastElements = elements;
                }
              });
              
              // Add final state
              if (newHighlightHistory.length > 0) {
                const lastTime = response.narration_timestamps[response.narration_timestamps.length - 1].end_time;
                newHighlightHistory.push({
                  time: lastTime + 1000, // Add 1 second after last highlight
                  elements: []
                });
              }
              
              setHighlightHistory(newHighlightHistory);
              setCurrentHighlightIndex(0);
            }
          }
          
          // Generate audio for the response
          try {
            await generateNarrationAudio(response.narration, false);
          } catch (error) {
            console.error('Error generating audio for response:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling doubt submission:', error);
      setNarration('Sorry, there was an error processing your question. Please try again.');
    }
  };

  const renderInteractiveElements = () => {
    if (interactiveElements.length === 0) return null;
    
    return (
      <div className="interactive-elements">
        <h3>Interactive Elements</h3>
        <ul>
          {interactiveElements.map((element, index) => (
            <li key={index} onClick={() => setHighlightedElements([element.id])}>
              {element.name}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderRelatedConcepts = () => {
    if (relatedConcepts.length === 0) return null;
    
    return (
      <div className="related-concepts">
        <h3>Related Concepts</h3>
        <ul>
          {relatedConcepts.map((concept, index) => (
            <li key={index}>
              <a href={concept.url} target="_blank" rel="noopener noreferrer">
                {concept.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const formatDoubtResponse = (response) => {
    if (!response) return null;
    
    return (
      <div className="doubt-response">
        <h3>AI Response</h3>
        <p>{response}</p>
      </div>
    );
  };

  return (
    <div className="visualization-controller">
      <div className="visualization-container" ref={visualizationRef}>
        {VisualizationComponent && (
          <VisualizationComponent
            data={data}
            highlightedElements={highlightedElements}
            currentTime={currentTime}
          />
        )}
      </div>
      
      <div className="controls">
        <button onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        {!isOriginalNarration && (
          <button onClick={handleRestoreOriginalNarration}>
            Restore Original Narration
          </button>
        )}
        
        <div className="narration-text">
          <p>{narration}</p>
        </div>
        
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnd}
          onError={handleAudioError}
          style={{ display: 'none' }}
        />
      </div>
      
      <div className="interactive-panel">
        {renderInteractiveElements()}
        {renderRelatedConcepts()}
      </div>
      
      <div className="doubt-panel">
        <input
          type="text"
          placeholder="Ask a question about this visualization..."
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleDoubtSubmission(e.target.value);
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
};

export default VisualizationController; 