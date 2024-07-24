const express = require('express');
const app = express();
const port = 8080;
const bodyParser = require('body-parser');
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const user_route = require('./routes/users');
const cors = require('cors');
const session = require('express-session');

app.use(cors());

// Session Setup
app.use(session({
  secret: 'Your_Secret_Key',
  resave: true,
  saveUninitialized: true
}));

app.use('/api/user', user_route);
 
// Handling Errors
app.use((err, res) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";
    res.status(err.statusCode).json({
      message: err.message,
    });
});
 
app.listen(port,() => console.log(`Server is running on port ${port}`));