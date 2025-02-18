const express = require('express');
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/generate-code', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a p5.js code generator. Generate only valid p5.js code for 2D visualizations. Include setup() and draw() functions. Only respond with code, no explanations."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        const generatedCode = completion.data.choices[0].message.content;
        res.json({ code: generatedCode });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to generate code' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
