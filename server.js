import fetch from 'node-fetch';
import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2";
import path from "path";
import { fileURLToPath } from "url";
import session from 'express-session';
import { Liquid } from 'liquidjs';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

// Correcte manier om __dirname te verkrijgen in ES-modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;
const engine = new Liquid();
app.engine('liquid', engine.express());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'liquid');

// Enable CORS for your frontend
import cors from "cors";
app.use(cors());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Matthijs06!',
    database: 'mealplanner',
});

connection.connect(err => {
    if (err) {
        console.error('❌ Database connectiefout:', err.stack);
        return;
    }
    console.log('✅ Verbonden met de database!');
});

const apiKey = 'kgU3MJJzUuFiPGUdzUpNrA==rKLe63S3RSf0vlqT';

// Endpoint to fetch time from the API
app.get('/time', async (req, res) => {
    try {
      // Request to API Ninjas World Time API
      const response = await fetch(`https://api.api-ninjas.com/v1/worldtime?timezone=Europe/Amsterdam`, {
        method: 'GET',
        headers: { 'X-Api-Key': apiKey }  // Provide API key in the headers
      });
  
      // Check if response is successful
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
  
      const data = await response.json();  // Parse the JSON response
      res.json(data);  // Send the data back to the frontend
    } catch (error) {
      console.error('Error fetching data:', error.message);
      res.status(500).json({ message: 'Failed to fetch data' });
    }
  });

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'zqnQuw5eZf',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middleware om de footer automatisch aan alle pagina's toe te voegen
app.use((req, res, next) => {
    res.locals.footer = 'partials/footer';
    next();
});

// Rootroute (Landingspagina)
app.get('/', (req, res) => {
    res.render('index', { title: "Welkom bij Meal Planner" });
});

// Registratiepagina
app.get('/register', (req, res) => {
    res.render('register', { title: "Registreren" });
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.render('register', { title: 'Registreren', errorMessage: 'Alle velden zijn verplicht!' });
    }

    const queryCheck = 'SELECT * FROM users WHERE email = ? OR name = ?';
    connection.execute(queryCheck, [email, name], (err, results) => {
        if (err) return res.render('register', { title: 'Registreren', errorMessage: 'Fout bij databaseverificatie.' });

        if (results.length > 0) {
            return res.render('register', {
                title: 'Registreren',
                errorMessage: results.find(user => user.email === email) ? 'E-mail al in gebruik!' : 'Gebruikersnaam al in gebruik!',
            });
        }

        const queryInsert = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        connection.execute(queryInsert, [name, email, password], (err) => {
            if (err) return res.render('register', { title: 'Registreren', errorMessage: 'Fout bij registratie.' });

            res.render('register', {
                title: 'Registreren',
                successMessage: 'Registratie succesvol! Je kunt nu <a href="/login">inloggen</a>.'
            });
        });
    });
});

// Loginpagina
app.get('/login', (req, res) => {
    res.render('login', { title: "Inloggen" });
});

app.post('/login', (req, res) => {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
        return res.render('login', { title: 'Inloggen', errorMessage: 'Vul alle velden in!' });
    }

    const query = 'SELECT * FROM users WHERE (email = ? OR name = ?) AND password = ?';
    connection.execute(query, [emailOrUsername, emailOrUsername, password], (err, results) => {
        if (err) return res.render('login', { title: 'Inloggen', errorMessage: 'Databasefout bij inloggen.' });

        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect('/dashboard');
        } else {
            return res.render('login', { title: 'Inloggen', errorMessage: 'Ongeldige inloggegevens!' });
        }
    });
});

// Dashboard route met correct gesorteerde meals op datum
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const query = 'SELECT * FROM meals WHERE user_id = ? ORDER BY date ASC';
    
    connection.execute(query, [req.session.user.id], (err, results) => {
        if (err) return res.send('Fout bij ophalen maaltijden.');

        const today = format(new Date(), 'EEEE - dd MMMM', { locale: nl })
        .replace(/\b\w/g, char => char.toUpperCase());
            
        res.render('dashboard', { 
            name: req.session.user.name, 
            meals: results, 
            today: today
        });
    });
});


// Maaltijd verwijderen
app.get('/delete-meal/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const query = 'DELETE FROM meals WHERE id = ? AND user_id = ?';
    connection.execute(query, [req.params.id, req.session.user.id], (err) => {
        if (err) return res.send('Fout bij verwijderen maaltijd.');
        res.redirect('/dashboard');
    });
});

// Maaltijd bewerken
app.get('/edit-meal/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const query = 'SELECT * FROM meals WHERE id = ?';
    connection.execute(query, [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.send('Maaltijd niet gevonden.');

        res.render('edit-meal', { meal: results[0] });
    });
});

app.post('/edit-meal/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { meal_name, calories, day } = req.body;
    const query = 'UPDATE meals SET name = ?, calories = ?, day = ? WHERE id = ?';

    connection.execute(query, [meal_name, calories, day, req.params.id], (err) => {
        if (err) return res.status(500).send('Fout bij bewerken.');
        res.send('Succes');  // AJAX response
    });
});

// Maaltijd toevoegen met een datum
app.post('/add-meal', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { meal_name, calories, date } = req.body;
    const query = 'INSERT INTO meals (user_id, date, name, calories) VALUES (?, ?, ?, ?)';

    connection.execute(query, [req.session.user.id, date, meal_name, calories], (err) => {
        if (err) {
            console.error('Fout bij toevoegen:', err); // Log de error
            return res.send('Fout bij toevoegen.');
        }
        res.redirect('/dashboard');
    });
});


// Start de server
app.listen(port, () => {
    console.log(`🚀 Server draait op http://localhost:${port}`);
});
