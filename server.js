const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));
const templatesDir = path.join(__dirname, 'templates');

// Step 1: Get random template
function getRandomTemplate() {
	const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.txt'));
	const nonEmptyFiles = files.filter(file => {
		const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8').trim();
		return content.length > 0;
	});

	if (nonEmptyFiles.length === 0) {
		const fallbackPath = path.join(__dirname, 'text1.txt');
		if (fs.existsSync(fallbackPath)) {
			return fs.readFileSync(fallbackPath, 'utf-8');
		}
		throw new Error('No template files available');
	}

	const randomFile = nonEmptyFiles[Math.floor(Math.random() * nonEmptyFiles.length)];
	return fs.readFileSync(path.join(templatesDir, randomFile), 'utf-8');
}

function extractPlaceholders(text) {
	const matches = text.match(/_(noun|verb|adjective)\d*_/gi);
	if (!matches) return [];

	// Remove duplicates
	return [...new Set(matches.map(m => m.replace(/_/g, '').toLowerCase()))];
}

function correctWord(word, type) {
    word = word.trim().toLowerCase();

    // Basic spelling corrections for common mistakes
    const spellingCorrections = {
        'huging': 'hugging',
        'runing': 'running',
        'jumpig': 'jumping',
        'swiming': 'swimming',
        'dancingg': 'dancing',
        'eated': 'ate',
        'goed': 'went',
        'runned': 'ran',
        // Add more as needed
    };

    if (spellingCorrections[word]) {
        word = spellingCorrections[word];
    }

    // For verbs, correct gerund forms (ending with 'ing')
    if (type === 'verb' && word.endsWith('ing')) {
        const base = word.slice(0, -3);
        if (base.length > 0) {
            const lastChar = base.slice(-1);
            const secondLast = base.slice(-2, -1);
            // Double consonant if CVC pattern (consonant-vowel-consonant)
            if (/[bcdfghjklmnpqrstvwxyz]/.test(lastChar) && /[aeiou]/.test(secondLast) && base.length > 1 && /[bcdfghjklmnpqrstvwxyz]/.test(base.slice(-3, -2))) {
                word = base.slice(0, -1) + lastChar + 'ing';
            }
        }
    }

    // For verbs, correct irregular past tenses if detected
    if (type === 'verb') {
        const irregularPast = {
            'ate': 'eat', // but if template expects past, keep
            // Since context is unknown, perhaps leave as is
        };
        // For now, leave verbs as entered, only correct spelling
    }

    return word;
}

function correctGrammar(story) {
    // Correct "a" to "an" before words starting with vowels
    story = story.replace(/\ba ([aeiouAEIOU])/gi, 'an $1');

    // Capitalize the first letter of sentences
    story = story.replace(/(^\w|\.\s*\w)/g, l => l.toUpperCase());

    return story;
}

function fillTemplate(template, words) {
	return template.replace(/_(noun|verb|adjective)\d*_/g, (match) => {
        	const key = match.replace(/_/g, '');
        	const type = key.replace(/\d+$/, '');
        	return correctWord(words[key], type) || match;
    	});
}

app.get('/', (req, res) => {
	res.send('Server is running!');
});

app.listen(3000, () => {
	console.log('Server running on http://localhost:3000');
});

// Routes

app.get('/template', (req, res) => {
    try {
        const template = getRandomTemplate();
        const placeholders = extractPlaceholders(template);
        console.log("Template fetched:", template); // 🔹 log to terminal
        res.json({ template, placeholders });
    } catch (err) {
        console.error("Error in /template:", err);
        res.status(400).json({ error: "Failed to load template" });
    }
});

app.post('/generate', (req, res) => {
    let { template, words } = req.body;

    if (!template || !words) {
        return res.status(400).json({ error: "Missing template or words" });
    }

    // Check for missing or empty values
    for (let key in words) {
        if (!words[key] || words[key].trim() === "") {
            return res.status(400).json({
                error: `Missing value for ${key}`
            });
        }
    }

    const story = template.replace(/_(noun|verb|adjective)\d*_/g, (match) => {
        const key = match.replace(/_/g, '');
        const type = key.replace(/\d+$/, '');
        return correctWord(words[key], type) || match;
    });

    const correctedStory = correctGrammar(story);

    res.json({ story: correctedStory });
});
