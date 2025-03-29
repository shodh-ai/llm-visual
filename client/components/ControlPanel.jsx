import React from 'react';

const ControlPanel = ({ 
  topics, 
  selectedTopic, 
  onTopicChange, 
  isLoading, 
  isPlaying, 
  onPlayPause,
  hasVisualization
}) => {
  return (
    <div className="control-panel">
      <div className="topic-selector">
        <label htmlFor="topic-select">Select Topic:</label>
        <select 
          id="topic-select"
          value={selectedTopic}
          onChange={(e) => onTopicChange(e.target.value)}
          disabled={isLoading}
        >
          <option value="">-- Select a topic --</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      </div>
      
      {hasVisualization && (
        <div className="playback-controls">
          <button 
            onClick={onPlayPause}
            disabled={isLoading || !hasVisualization}
            className={isPlaying ? 'playing' : ''}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlPanel; 