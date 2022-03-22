"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.set('view engine', 'ejs');
app.use(express_1.default.static('public'));
// app.use(express.urlencoded({ extended:false }));
const port = 5000;
app.get('/', (req, res) => {
    res.redirect('/home');
});
app.get('/home', (req, res) => {
    res.render('home', { title: 'Home' });
});
app.listen(port, () => { console.log(`Listening in http://localhost:${port}`); });
