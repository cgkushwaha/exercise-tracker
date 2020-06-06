const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
require('dotenv').config()
const ObjectId = require('mongodb').ObjectID;

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

// Mongoose schema and models
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
})

const User = mongoose.model('User', UserSchema);

const ExerciseSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  description: String,
  duration: Number,
  date: Date
});

const Exercise = mongoose.model('Exercise', ExerciseSchema);

// Handlers

// handler to create new user
const createNewUser = async function (req, res) {
  try {
    // get username from request
    const { username } = req.body;
    // if username is not empty
    if (username) {
      // check username already exits in DB
      const users = await User.find({ username });
      if (users && users.length > 0) {
        return res.json({ error: "Username already taken" });
      } else {
        // if it's new user create it
        const newUser = await User.create({ username: username });
        return res.json({ username: newUser.username, _id: newUser._id });
      }
    } else {
      res.json({ error: "Username is not passed" });
    }
  } catch (err) {
    console.log(err);
    return res.json({ error: "Internal server error" });
  }
}

// handler to find all users
const getAllUsers = function (req, res) {
  return User.find({})
    .then(users => res.json(users))
    .catch(err => {
      console.log(err);
      return res.json({ error: err });
    });
}

// handler to add new exercise
const addNewExercise = async function (req, res) {
  const { userId, description, duration, date } = req.body;
  return Exercise
    .create({ userId, description, duration, date })
    .then(newExercise => res.json(newExercise))
    .catch(err => {
      console.log(err);
      return res.json({ error: err });
    })
}

// handler to get user exercise log details
const getUserExerciseLog = async function (req, res) {
  try {
    const { userId, from, to, limit } = req.query;

    // userId is mandatory query parameter
    if (!userId) {
      return res.json({ error: "Required parameter is missing" })
    }

    const exerciseFilters = {};
    exerciseFilters.userId = userId;
    // if from and to are passed through query parameters
    if (from && to) {
      exerciseFilters.date = { $gte: from, $lte: to };
    }

    // find user by userId
    const user = await User
      .findById(userId);
    // find exercises using filters
    const exercises = await Exercise
      .find(exerciseFilters)
      .select("-_id -__v -userId")
      .limit(limit ? parseInt(limit) : 0);

    // construct response object
    const response = {
      userId: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises
    }
    return res.json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// APIs

// create new user API endpoint
app.post("/api/exercise/new-user", createNewUser);
// get all users details API endpoint
app.get("/api/exercise/users", getAllUsers);
// add exercise API endpoint
app.post("/api/exercise/add", addNewExercise);
// get user exercise log API endpoint
app.get("/api/exercise/log", getUserExerciseLog)


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
