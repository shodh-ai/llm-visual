# Database Schema and Architecture Visualizer

An interactive web application that helps visualize and understand MBA course contents.

## Features

### Schema Design Visualization
### Parallel Architecture Visualization
### AI-Powered Analysis

## Prerequisites

- Python 3.8 or higher
- Node.js and npm (for frontend dependencies)
- Anthropic API key

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/llm_visual.git
   cd llm_visual
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Install JavaScript dependencies:
   ```bash
   # Install npm if you haven't already
   ```

4. Set up environment variables:
   - Create a `.env` file in the project root
   - Add your Anthropic API key:
     ```
     ANTHROPIC_API_KEY=your_api_key_here
     ```

5. Run the application:
   ```bash
   python app.py
   ```

## Usage

1. Access the application:
   - Open `http://localhost:5000` in your browser
   - The application works best in Chrome or Firefox

2. Schema Design Tab:
   - View the default e-commerce database schema
   - Ask questions like:
     - "Show tables involved in order processing"
     - "Identify tables that need normalization"
     - "Show relationships between Orders and Products"

3. Parallel Architecture Tab:
   - Explore different database architectures
   - Ask questions like:
     - "How does shared-nothing architecture work?"
     - "Explain data distribution in shared-disk architecture"
     - "Show query processing flow"

## Project Structure

```
llm_visual/
├── app.py                 # Flask application
├── static/
│   ├── js/
│   │   ├── main.js       # Main JavaScript
│   │   ├── database_visualizer.js    # Schema visualization
│   │   └── parallel_visualizer.js    # Architecture visualization
├── templates/
│   └── index.html        # Main HTML template
└── requirements.txt      # Python dependencies
```

## Technologies Used

### Backend
- Flask: Web framework
- Python: Server-side logic
- Anthropic Claude API: AI analysis

### Frontend
- D3.js: Interactive visualizations
- Tailwind CSS: Styling
- JavaScript: Client-side logic
