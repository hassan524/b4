require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const User = require('./models/User')
const Exercise = require('./models/Exercise');


const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect('mongodb+srv://h3940180:sEWxY9BxqXbt7U4J@cluster0.az0kmng.mongodb.net/exerciseDB?retryWrites=true&w=majority')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Basic route to check server
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;

  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find(); // <-- await added

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;

    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newExercise = new Exercise({
      userId: user._id, // You can use this to link the user later
      username: user.username,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : undefined  // undefined lets Mongoose use default
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });
  } catch (err) {
    console.error(err); // this will help debug
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const from = req.query.from; // example: '2023-01-01'
  const to = req.query.to;     // example: '2023-12-31'
  const limit = req.query.limit; // example: '5'

  try {
    // Find user by id
    const user = await User.findById(userId);
    if (!user) return res.json({ error: 'User not found' });

    // Find exercises for this user
    let exercises = await Exercise.find({ userId: userId });

    // Filter by date if from or to is given
    if (from) {
      const fromDate = new Date(from);
      exercises = exercises.filter(ex => new Date(ex.date) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      exercises = exercises.filter(ex => new Date(ex.date) <= toDate);
    }

    // Limit results if limit is given
    if (limit) {
      exercises = exercises.slice(0, Number(limit));
    }

    // Format response
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
