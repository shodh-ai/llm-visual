import React, { useState, useEffect, useRef } from 'react';

const DoubtBox = ({ onSubmit, isLoading, socket }) => {
  const [doubt, setDoubt] = useState('');
  const [error, setError] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const responseRef = useRef(null);

  // Set up socket event listeners for streaming responses
  useEffect(() => {
    if (!socket) return;

    // Listen for streaming chunks
    const handleDoubtChunk = (data) => {
      setIsStreaming(true);
      setStreamingResponse(prev => prev + data.content);
    };

    // Listen for completion of streaming
    const handleDoubtComplete = (data) => {
      setIsStreaming(false);
    };

    // Listen for errors
    const handleError = (data) => {
      setError(data.message);
      setIsStreaming(false);
    };

    // Register event listeners
    socket.on('doubt_chunk', handleDoubtChunk);
    socket.on('doubt_complete', handleDoubtComplete);
    socket.on('error', handleError);

    // Clean up event listeners on unmount
    return () => {
      socket.off('doubt_chunk', handleDoubtChunk);
      socket.off('doubt_complete', handleDoubtComplete);
      socket.off('error', handleError);
    };
  }, [socket]);

  // Auto-scroll to the bottom of the response as it streams in
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [streamingResponse]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!doubt.trim() || !onSubmit) {
      return;
    }

    setError(null);
    setStreamingResponse(''); // Clear previous response
    
    try {
      onSubmit(doubt);
      // Don't clear the input until we start receiving a response
    } catch (err) {
      setError('Failed to process your doubt. Please try again.');
      console.error('Error submitting doubt:', err);
    }
  };

  return (
    <div className="doubt-box">
      <h3>Ask About the Visualization</h3>
      <form onSubmit={handleSubmit}>
        <div className="input-container">
          <input
            type="text"
            value={doubt}
            onChange={(e) => setDoubt(e.target.value)}
            placeholder="Ask any question about the visualization..."
            disabled={isLoading || isStreaming}
          />
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {streamingResponse && (
          <div className="streaming-response" ref={responseRef}>
            <p>{streamingResponse}</p>
            {isStreaming && <span className="typing-indicator">●●●</span>}
          </div>
        )}

        <button
          type="submit"
          disabled={!doubt.trim() || isLoading || isStreaming}
          className={isLoading || isStreaming ? 'loading' : ''}
        >
          {isLoading || isStreaming ? 'Processing...' : 'Ask Question'}
        </button>
      </form>
    </div>
  );
};

export default DoubtBox; 