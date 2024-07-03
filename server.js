const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;

const loginRoute = require('./login');
const signupRoute = require('./signup/signup');

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static(path.join(__dirname, 'static')));

app.use(session({
    secret: 'secret', 
    resave: false, 
    saveUninitialized: true
}));

app.use("/login", loginRoute);
app.use("/signup", signupRoute);

app.get('/',function (req, res) {
    res.redirect('/login');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})