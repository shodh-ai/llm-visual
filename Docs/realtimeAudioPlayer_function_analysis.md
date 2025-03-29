# DOC: RealtimeAudioPlayer.jsx 

### startSession
**Purpose**: Establishes a WebRTC connection with OpenAI's API.
**Usage**: Called when the component mounts or when retrying a connection.
**Relevance**: Critical - this is the main function that initiates the 

WebRTC session.
### stopSession
**Purpose**: Cleans up and terminates the WebRTC connection.
**Usage**: Called when the component unmounts, when retrying a connection, or when the user clicks "Close AI Response".
**Relevance**: Critical - ensures proper cleanup of resources.

### requestMicrophoneAccess
**Purpose**: Requests permission to access the user's microphone.
**Usage**: Called during session initialization and when the user clicks the "Grant Microphone Access" button.
**Relevance**: Important - enables bidirectional audio communication.

### handleAudioStart
**Purpose**: Handles events when audio playback begins.
**Usage**: Attached as an event listener to the audio element.
**Relevance**: Important - synchronizes word timing with audio playback.

### handleAudioTimeUpdate
**Purpose**: Tracks audio playback position for timing synchronization.
**Usage**: Attached as an event listener to the audio element.
**Relevance**: Important - provides accurate timing for highlighting.

### toggleMute
**Purpose**: Mutes or unmutes the user's microphone.
**Usage**: Called when the user clicks the mute button.
**Relevance**: Important - provides user control over microphone input.

### handleReturn
**Purpose**: Ends the current session and returns to the visualization view.
**Usage**: Called when the user clicks the "Close AI Response" button.
**Relevance**: Important - allows users to exit the session.

# Text Processing and Highlighting
### debouncedHighlightUpdate
**Purpose**: Updates highlighted nodes with debouncing to prevent flickering.
**Usage**: Called when node IDs are detected in the text or audio.
**Relevance**: Critical - core highlighting functionality.

### processAudioTranscriptDelta
**Purpose**: Processes text chunks received from OpenAI.
**Usage**: Called when receiving text transcript data from the data channel.
**Relevance**: Critical - handles the main text response.

### processWordTimingData
**Purpose**: Processes word timing information for synchronized highlighting.
**Usage**: Called when receiving word timing data from OpenAI.
**Relevance**: Critical - enables synchronized highlighting with audio.

### startWordTimingInterval
**Purpose**: Sets up an interval to process word timings for highlighting.
**Usage**: Called when word timing data starts arriving.
**Relevance**: Important - drives the highlighting timing system.

### updateCurrentWordIndex
**Purpose**: Updates which word is currently being highlighted in the text.
**Usage**: Called during word timing processing.
**Relevance**: Important - keeps the text highlighting in sync with audio.


# UI Rendering
### renderTextWithHighlights
**Purpose**: Renders the text transcript with the current word highlighted.
**Usage**: Called during component rendering.
**Relevance**: Important - provides visual feedback on current word.

### renderHighlightedNodes
**Purpose**: Renders a list of currently highlighted node IDs.
**Usage**: Called during component rendering.
**Relevance**: Important - shows which nodes are highlighted.

### renderSpeechPosition
**Purpose**: Renders a progress bar for audio playback.
**Usage**: Called during component rendering.
**Relevance**: Useful - provides visual feedback on playback progress.

### scrollToCurrentWord
**Purpose**: Scrolls the text display to keep the current word visible.
**Usage**: Called when the current word changes.
**Relevance**: Useful - improves user experience by keeping focus on current word.

# Utility Functions
### addDebugInfo
**Purpose**: Adds messages to the debug log.
**Usage**: Called throughout the component for logging.
**Relevance**: Useful for debugging, but not critical for functionality.

### handleTokenResponse
**Purpose**: Processes the response from the token endpoint.
**Usage**: Called after fetching a token from the server.
**Relevance**: Critical - parses the API key needed for OpenAI connection.

### retryConnection
**Purpose**: Attempts to reconnect after a connection failure.
**Usage**: Called when a connection error occurs or when the user clicks "Retry Connection".
**Relevance**: Important - provides resilience to connection issues.

### scheduleClearHighlights
**Purpose**: Sets a timeout to clear highlights after a period of inactivity.
**Usage**: Called when no new highlights are detected for a while.
**Relevance**: Useful - prevents stale highlights from persisting.
