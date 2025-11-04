// server.js - Node.js + Express Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors({
       origin: [
           'https://study-hub-app-frontend.onrender.com',
           'http://localhost:5500',
           'http://127.0.0.1:5500'
       ],
       credentials: true,
       methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
       allowedHeaders: ['Content-Type', 'Authorization']
   }));
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb+srv://studyhubuser:p8JRxqMzsZlXpid4@cluster0.q82lajb.mongodb.net/studyhub?appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Flashcard Schema
const flashcardSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    mastered: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Note Schema
const noteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Flashcard = mongoose.model('Flashcard', flashcardSchema);
const Note = mongoose.model('Note', noteSchema);

// Authentication Middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });
        
        await user.save();
        
        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Flashcard Routes
app.get('/api/flashcards', authenticate, async (req, res) => {
    try {
        const flashcards = await Flashcard.find({ userId: req.userId });
        res.json(flashcards);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/flashcards', authenticate, async (req, res) => {
    try {
        const { subject, front, back } = req.body;
        
        const flashcard = new Flashcard({
            userId: req.userId,
            subject,
            front,
            back
        });
        
        await flashcard.save();
        res.status(201).json(flashcard);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/flashcards/:id', authenticate, async (req, res) => {
    try {
        const flashcard = await Flashcard.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            req.body,
            { new: true }
        );
        
        if (!flashcard) {
            return res.status(404).json({ error: 'Flashcard not found' });
        }
        
        res.json(flashcard);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/flashcards/:id', authenticate, async (req, res) => {
    try {
        const flashcard = await Flashcard.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });
        
        if (!flashcard) {
            return res.status(404).json({ error: 'Flashcard not found' });
        }
        
        res.json({ message: 'Flashcard deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Note Routes
app.get('/api/notes', authenticate, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.userId });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/notes', authenticate, async (req, res) => {
    try {
        const { subject, title, content } = req.body;
        
        const note = new Note({
            userId: req.userId,
            subject,
            title,
            content
        });
        
        await note.save();
        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/notes/:id', authenticate, async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });
        
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        res.json({ message: 'Note deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Progress Route
app.get('/api/progress', authenticate, async (req, res) => {
    try {
        const flashcards = await Flashcard.find({ userId: req.userId });
        
        const progress = {};
        flashcards.forEach(card => {
            if (!progress[card.subject]) {
                progress[card.subject] = { total: 0, mastered: 0 };
            }
            progress[card.subject].total++;
            if (card.mastered) {
                progress[card.subject].mastered++;
            }
        });
        
        res.json(progress);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

});

