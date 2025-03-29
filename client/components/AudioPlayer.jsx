import React, { useState, useEffect, useRef } from 'react';

const AudioPlayer = ({ socket }) => {
  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const currentAudioRef = useRef(null);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    const handleAudioChunk = (data) => {
      console.log('Received audio chunk of size:', data.audio_data ? data.audio_data.length : 'unknown');
      
      if (data.audio_data) {
        setAudioQueue(prev => [...prev, data.audio_data]);
      } else {
        console.error('Received audio chunk without audio_data:', data);
      }
    };
    
    socket.on('audio_chunk', handleAudioChunk);
    
    return () => {
      socket.off('audio_chunk', handleAudioChunk);
    };
  }, [socket]);
  
  // Play audio from queue
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlaying && !isMuted) {
      playNextAudio();
    }
  }, [audioQueue, isPlaying, isMuted]);
  
  const playNextAudio = () => {
    if (audioQueue.length === 0) {
      setIsPlaying(false);
      return;
    }
    
    setIsPlaying(true);
    
    try {
      const nextAudio = audioQueue[0];
      
      // Check if nextAudio is valid
      if (!nextAudio || !nextAudio.length) {
        console.error('Invalid audio data:', nextAudio);
        setAudioQueue(prev => prev.slice(1));
        setIsPlaying(false);
        return;
      }
      
      const audioBlob = new Blob([nextAudio], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setAudioQueue(prev => prev.slice(1));
        setIsPlaying(false);
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        setAudioQueue(prev => prev.slice(1));
        setIsPlaying(false);
      };
      
      // Play the audio
      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        URL.revokeObjectURL(audioUrl);
        setAudioQueue(prev => prev.slice(1));
        setIsPlaying(false);
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioQueue(prev => prev.slice(1));
      setIsPlaying(false);
    }
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    if (!isMuted && isPlaying && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  return (
    <div className="audio-player">
      <button 
        onClick={toggleMute} 
        className={`mute-button ${isMuted ? 'muted' : ''}`}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      {isPlaying && <span className="playing-indicator">Playing audio...</span>}
    </div>
  );
};

export default AudioPlayer;
