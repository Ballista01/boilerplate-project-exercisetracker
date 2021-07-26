/* eslint-disable no-underscore-dangle */
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.once('open', () => console.log('database connected!'));

const { Schema } = mongoose;
const userSchema = new Schema({
  username: { type: String, required: true },
  exercises: [
    {
      description: String,
      duration: Number,
      date: Date,
    },
  ],
});

const User = mongoose.model('User', userSchema);

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/views/index.html`);
});

async function createUser(uname) {
  const existingUser = await User.findOne({ username: uname });
  if (existingUser) {
    return { ...existingUser._doc, alreadyExist: true };
  }
  const newUser = new User({ username: uname, exercises: [] });
  const saveRes = await newUser.save();
  return { ...saveRes._doc, alreadyExist: false };
}
app.post('/api/users', bodyParser.urlencoded({ extended: false }), (req, res) => {
  console.log(req.body.username);
  createUser(req.body.username).then((retUser) => {
    const { _id, username } = retUser;
    res.json({ _id, username });
  });
});
app.get('/api/users', (req, res) => {
  User.find({}, '_id username', (err, allUsers) => {
    const allUsersArr = [...allUsers];
    res.json(allUsersArr);
  });
});
app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), (req, res) => {
  const userId = req.params._id;
  const { description, duration } = req.body;
  let { date } = req.body;
  if (date == null || date === '') {
    date = new Date();
  } else {
    date = new Date(date);
  }

  User.findById(userId, (err, userDoc) => {
    if (err) console.err(err);
    userDoc.exercises.push({ description, duration, date });
    userDoc.save((saveErr, savedUserDoc) => {
      if (saveErr) console.err(saveErr);
      const { _id, username } = savedUserDoc;
      res.json({
        _id,
        username,
        description,
        duration,
        date,
      });
    });
  });
});
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  console.log(`userId=${userId}, from=${from}, to=${to}, limit=${limit}`);
  User.findById(userId, (err, userDoc) => {
    if (err) console.err(err);
    const { _id, username, exercises } = userDoc;
    let filteredExercises = exercises.filter(
      (item) => item.date >= new Date(from) && item.date < new Date(to),
    );
    if (filteredExercises.length > limit) {
      filteredExercises = filteredExercises.slice(0, limit);
    }
    const retUserDoc = {
      _id,
      username,
      log: filteredExercises,
      count: filteredExercises.length,
    };
    res.json(retUserDoc);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
