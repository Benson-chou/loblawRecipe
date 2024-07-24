const {Connector} = require('@google-cloud/cloud-sql-connector');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require("dotenv");
dotenv.config();

const express = require('express');
const path = require('path');
const router = express.Router();
const mysql = require('mysql2/promise');
const flash = require('connect-flash');
const { spawn } = require('child_process');

const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const connector = new Connector();
const clientOpts = connector.getOptions({
    instanceConnectionName: process.env.CLOUD_CONNECTION_NAME,
    ipType: 'PUBLIC',
  });

const pool = mysql.createPool({
    ...clientOpts,
    host: process.env.CLOUD_HOST,
    user: process.env.CLOUD_USER,
    password: process.env.CLOUD_PASSWORD,
    database: process.env.CLOUD_DB_NAME,
});

router.use(flash())

// This is just for testing
var items = [
    {
        id: 1,
        itemname: 'Sword of Truth',
        bonuspoints: 10,
        condition: 'New'
    },
    {
        id: 2,
        itemname: 'Shield of Valor (Adding more to see how the box reacts)',
        bonuspoints: 8,
        condition: 'Used'
    },
    {
        id: 3,
        itemname: 'Helmet of Wisdom',
        bonuspoints: 5,
        condition: 'New'
    },
    {
        id: 4,
        itemname: 'Boots of Speed',
        bonuspoints: 7,
        condition: 'Used'
    },
    {
        id: 5,
        itemname: 'Cloak of Invisibility',
        bonuspoints: 12,
        condition: 'New'
    }
];

// http://localhost:3000/home
router.get('/', async (request, response) => {
    // Get the items list here!
    // First step: Get the current date and check if there are any results that include this date
    let today = new Date().toISOString().slice(0, 10)
    // We need to find a place to clear the older deals!!!
    const checkquery = 'SELECT * FROM items WHERE valid_from <= ? AND valid_to >= ?';
    try{
        // Issue from last commit was that connection is undefined, so running connection.query gives an error
        // Root cause being forgot to add promise to require SQL line, so we are not awaiting for the connection to establish
        const connection = await pool.getConnection();
        const [results] = await connection.query(checkquery, [today, today]);

        if (results.length == 0) {
            // Clear the table first
            const clearquery = 'TRUNCATE TABLE items'
            connection.query(clearquery);
            console.log("truncated table")
            // Run the python script to load table items with newest deals
            // !!! Bug in this spawn line
            const python = spawn('python', ['../scrape_items.py']);
            python.on('close', (code) => {
                console.log(`child process close all stdio with code: ${code}`);
            })
        }
        const getquery = 'SELECT * FROM items'
        const [db_items] = await connection.query(getquery);
            if (db_items.length > 0){
                var items = db_items;
            }

        if (request.session.loggedin) {
            let userAllergies = request.session.allergies !== undefined ? request.session.allergies : 'None';
            response.render(path.join(__dirname + '/home.ejs'), {location: '', items : items, 
                allergies: userAllergies, loggedin: true, username: request.session.username, item_message : request.flash('item_message'), recipes : {}});
    
        } else {
            // Not logged in
            response.render(path.join(__dirname + '/home.ejs'), {location: '', items : items, 
                allergies: "None", loggedin: false, item_message : request.flash('item_message'), recipes : {}});
        }
    } 
        catch (error) {
            console.error('Error loading home page (loading items): ', error);
            // Not sure what to do here
        }
        
    })

 
// Get the location informations
// router.post('/location', (req, res) => {
//     const location = req.body;
// })

router.post('/', (req, res) => {
    if (req.body.itemCheckbox === undefined){
        req.flash('item_message', 'Please select at least one item')
        res.redirect('/home')
        // flash a message saying please pick at least one item
        return;
    }
    const geminiConfig = {
    temperature: req.body.creativity / 10,
    topP: 1,
    topK: 1,
    maxOutputTokens: 4096,
    };

    const geminiModel = googleAI.getGenerativeModel({
        model: "gemini-pro", 
        geminiConfig
    });

    const generate = async () => {
        try {
            const prompt = `Can you recommend me some online recipes with their URL using\
        ${req.body.itemCheckbox} with a budget of ${req.body.budget} and \
        avoid these allergies: ${req.body.allergies}. \
        Please output only the json form of Recipe_name, Description, and URL 
        ex: [{
  "Recipe_name": "One Pot Cheeseburger Pasta",
  "Description": "This easy one pot cheeseburger pasta recipe is perfect for busy weeknights. It's made with ground beef, pasta, cheese, and a creamy tomato sauce.",
  "URL": "https://www.momontimeout.com/easy-one-pot-cheeseburger-pasta/"
}]. \
        (Please use the exact header as defined, do not include any other text, and don't start a new recipe if there are not enough tokens)`;
            const result = await geminiModel.generateContent(prompt);
            var responses = result.response.text();
            responses = responses.replace("```json", "");
            responses = responses.replace("```", "");
            console.log(responses)
            const recipes = JSON.parse(responses);

            console.log(recipes.length)
            // Make sure recipes is not empty
            if (recipes.length === 0){
                req.flash('item_message', 'No recipes were generated. Please try again!')
                res.redirect('/home')
                return;
            } 
            let userAllergies = req.session.allergies ? req.session.allergies : 'None';

            res.render(path.join(__dirname + '/home.ejs'), {location: '', items : items, 
                allergies: userAllergies, loggedin: req.session.loggedin, username: req.session.username, 
                item_message : req.flash('item_message'), recipes : recipes});
    
            
            // Insert recipe into the table
            // const insertRecipe = (recipe) => {
            //     const insertquery = "INSERT INTO recipes (recipe_name, description, url)\
            //         VALUES (?, ?, ?)"
            //     connection.query(insertquery, [recipe['Recipe_name'], recipe['Description'], recipe['URL']], (err, res) => {
            //         if (err) throw err;
            //         console.log(`Inserted recipe: ${recipe['Recipe name']}`);
            //     });
            // };
            // recipes.array.forEach(recipe => {
            //     insertRecipe(recipe);
            // });
            // Load the response into database first and then create tables? 
        }catch (error){
            console.log("response error", error);
        }
    }
    generate()
})

function saverecipe() {

}

function deleterecipe() {

}

module.exports = router;