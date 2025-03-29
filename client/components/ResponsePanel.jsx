import React from 'react';

const ResponsePanel = ({ 
  response, 
  audioUrl, 
  onPlayAudio, 
  isAudioPlaying, 
  audioRef,
  currentTime,
  highlightedWord
}) => {
  return (
    <div className="response-panel">
      <div className="response-content">
        {response ? (
          <div className="narration">
            {response.split(' ').map((word, index) => (
              <span 
                key={index}
                className={word === highlightedWord ? 'highlighted' : ''}
              >
                {word}{' '}
              </span>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Select a topic to view narration</p>
          </div>
        )}
      </div>
      
      {audioUrl && (
        <div className="audio-controls">
          <button 
            onClick={onPlayAudio}
            className={isAudioPlaying ? 'playing' : ''}
          >
            {isAudioPlaying ? 'Pause Audio' : 'Play Audio'}
          </button>
          <div className="time-display">
            {Math.floor(currentTime / 1000)}s
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsePanel; 