if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
};

import express, { Application, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import flash from 'express-flash';
import session from 'express-session';
import methodOverride from 'method-override';
import alea from 'alea';
import mongoose from 'mongoose';
import fs from 'fs';

import User from './models/user_model';

const app: Application = express();
const prng: any = new (alea as any)();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
// @ts-ignore
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

function find_data(){
    User.find().sort({ id: 'asc' })
        .then((result) => {
            let user_datas = result;
            let case_datas = JSON.parse(fs.readFileSync('./json/cases.json', 'utf-8'));
            let upgrade_datas = JSON.parse(fs.readFileSync('./json/upgrades.json', 'utf-8'));

            main(user_datas, case_datas, upgrade_datas)
        });
}

function main(user_datas: any, case_datas: any, upgrade_datas: any){
    let crime_rate_increase = 0;

    const initializePassport = require('./passport-config');
    initializePassport(
        passport,
        // @ts-ignore
        username => user_datas.find(user => user.username === username),
        // @ts-ignore
        id => user_datas.find(user => user.id === id)
    );

    //#region Functions
    function check_authenticated(req: Request, res: Response, next: NextFunction){
        if(req.isAuthenticated()){
            return next();
        }

        res.redirect('/login');
    };

    function check_not_authenticated(req: Request, res: Response, next: NextFunction){
        if(req.isAuthenticated()){
            return res.redirect('/');
        }

        next();
    };

    function get_random_number(min: number, max: number){
        let value: number = Math.floor(prng() * (max - min + 1) + min);

        return value;
    };

    function get_random_case(){
        let random_case_theme: number = get_random_number(1, case_datas.length);

        return random_case_theme;
    };

    function get_random_case_identity(random_case_theme: any){
        let random_case_identity: any = [];
        let case_identity = case_datas[random_case_theme - 1].identity;

        for(let i = 0; i < case_identity.length; i++){
            for(let j = 0; j < case_identity[i][1]; j++){
                if(case_identity[i][0] == "Male"){
                    let temp_random_number = get_random_number(0, list_of_name.male.length - 1);
                    let temp_random_name = list_of_name.male[temp_random_number];
                    let temp_random_age = get_random_number(case_identity[i][2][0], case_identity[i][2][1]);

                    random_case_identity.push([temp_random_name, temp_random_age, "Pria"]);
                }

                else if(case_identity[i][0] == "Female"){
                    let temp_random_number = get_random_number(0, list_of_name.female.length - 1);
                    let temp_random_name = list_of_name.female[temp_random_number];
                    let temp_random_age = get_random_number(case_identity[i][2][0], case_identity[i][2][1]);

                    random_case_identity.push([temp_random_name, temp_random_age, "Wanita"]);
                }
            }
        }

        return random_case_identity;
    };

    //#endregion Functions

    //#region Main Request
    app.get('/', check_authenticated, (req: Request, res: Response) => {
        res.redirect('/home');
    });

    app.get('/home', check_authenticated, (req: Request, res: Response) => {
        res.render('home', { title: 'Utama', user_data: req.user, case_datas });
    });

    app.post('/home', check_authenticated, (req: Request, res: Response) => {
        // @ts-ignore
        let user_request: any = req.user;
        let crime_case_data: any = user_request.crime_case;
        let current_day_length: number = crime_case_data.length - 1;
        let case_data = crime_case_data[current_day_length].case;
        let current_case_length: number = case_data.length - 1;
        let current_case_data: any = case_data[current_case_length];
        
        if(req.body.type == 'response'){
            if(req.body.response == 'guilty' && current_case_data.case_response == null){
                current_case_data.case_response = 'guilty';
            };
        
            if(req.body.response == 'innocent' && current_case_data.case_response == null){
                current_case_data.case_response = 'innocent';
            };

            let current_case_id = current_case_data.case_id;
            let current_case_crime = case_datas[current_case_id - 1].crime;
            let current_case_conclusion = case_datas[current_case_id - 1].conclusion;
            let current_case_is_guilty = case_datas[current_case_id - 1].case_is_guilty;
            let current_case_rank = case_datas[current_case_id - 1].rank;
            let current_case_response_is_guilty = true;
            if(current_case_data.case_response == 'innocent'){
                current_case_response_is_guilty = false;
            }

            if(current_case_response_is_guilty != current_case_is_guilty){
                if(current_case_rank != 0){
                    crime_rate_increase += current_case_rank * 5;
                }

                else if(current_case_rank == 0){
                    crime_rate_increase += get_random_number(10, 20);
                };

                crime_rate_increase += get_random_number(-5, 5);
            };

            let money_increase_based_on_case = 0;
            let money_increase_based_on_max = 0;
            let money_increase_based_on_random = 0;

            if(current_case_response_is_guilty == current_case_is_guilty){
                user_request.crime_case_correct += 1

                if(current_case_rank != 0){
                    money_increase_based_on_case = current_case_rank * 50;
                    user_request.money_current += money_increase_based_on_case;
                }

                else if(current_case_rank == 0){
                    money_increase_based_on_case = get_random_number(2, 4) * 50;
                    user_request.money_current += money_increase_based_on_case;
                };

                money_increase_based_on_max = user_request.money_max * (user_request.money_growth / 100);
                user_request.money_current += money_increase_based_on_max;

                money_increase_based_on_random = get_random_number(1, 5) * 10;
                user_request.money_current += money_increase_based_on_random;

                if(user_request.money_current < 0){
                    user_request.money_current = 0;
                };

                if(user_request.money_current > user_request.money_max){
                    user_request.money_current = user_request.money_max;
                };
            };

            let money_increase_total = Math.trunc(money_increase_based_on_case + money_increase_based_on_max + money_increase_based_on_random);

            // console.log(money_increase_based_on_case, money_increase_based_on_max, money_increase_based_on_random, money_increase_total);

            crime_case_data[current_day_length].case_current += 1;
            if(crime_case_data[current_day_length].case_current < crime_case_data[current_day_length].case_max){
                let random_case_theme: any = get_random_case();
        
                // @ts-ignore
                let crime_case_taken = req.user.crime_case_taken;
        
                for(let i = 0; i < crime_case_taken.length; i++){
                    if(random_case_theme == crime_case_taken[i]){
                        random_case_theme = get_random_case();
                        i = -1;
                    };
                };
                
                let random_case_identity: any = get_random_case_identity(random_case_theme);
        
                case_data.push({
                    "case_id": random_case_theme,  
                    "case_response": null,
                    "case_identity" : random_case_identity
                });
        
                crime_case_taken.push(random_case_theme);
            }

            res.redirect(`/home?previous_case_crime=${current_case_crime}&previous_case_conclusion=${current_case_conclusion}&previous_case_is_guilty=${current_case_is_guilty}&previous_case_response_is_guilty=${current_case_response_is_guilty}&money_increase_total=${money_increase_total}`);
        }

        if(req.body.type == 'next'){
            if(crime_case_data[current_day_length].case_current >= crime_case_data[current_day_length].case_max){
                if(crime_case_data.length != 30){
                    const random_case_max: number = get_random_number(1, 2);
                    
                    // @ts-ignore
                    let crime_case_taken = req.user.crime_case_taken; 
                    let random_case_theme: any = get_random_case();
            
                    for(let i = 0; i < crime_case_taken.length; i++){
                        if(random_case_theme == crime_case_taken[i]){
                            random_case_theme = get_random_case();
                            i = -1;
                        };
                    };
            
                    let random_case_identity: any = get_random_case_identity(random_case_theme);
            
                    crime_case_data.push({
                        "day": crime_case_data.length + 1,
                        "case_current" : 0,
                        "case_max" : random_case_max,
                        "case": [
                            {
                                "case_id": random_case_theme,  
                                "case_response": null,
                                "case_identity" : random_case_identity
                            }
                        ]
                    });
            
                    crime_case_taken.push(random_case_theme);
                }

                else if(crime_case_data.length == 30){
                    crime_case_data.push({"status": "Done"});
                }
                
                // console.log(`Crime Rate Increase    : ${crime_rate_increase}`);

                let random_crime_rate_decrease = get_random_number(5, 10);
                user_request.crime_rate_current += crime_rate_increase;
                user_request.crime_rate_current -= random_crime_rate_decrease;
                crime_rate_increase = 0;

                if(user_request.crime_rate_current < 0){
                    user_request.crime_rate_current = 0;
                };

                if(user_request.crime_rate_current > user_request.crime_rate_max){
                    user_request.crime_rate_current = user_request.crime_rate_max;
                };

                let user_people_current_increase = user_request.people_max * (user_request.people_growth / 100);
                let user_people_current_decrease = (user_request.people_current * (user_request.crime_rate_current / 100)) / 2;
                let user_people_current_base_random_value = Math.trunc(user_people_current_increase / 4);
                let user_people_current_random = get_random_number(-1 * user_people_current_base_random_value, user_people_current_base_random_value);

                user_request.people_current += user_people_current_increase;
                user_request.people_current += user_people_current_random;
                user_request.people_current -= user_people_current_decrease;

                if(user_request.people_current < 0){
                    user_request.people_current = 0;
                };

                if(user_request.people_current > user_request.people_max){
                    user_request.people_current = user_request.people_max;
                };

                let user_prosperity_current_increase = user_request.prosperity_max * ((100 - user_request.crime_rate_current) * user_request.prosperity_growth / 10000 * 2);
                let user_prosperity_current_decrease = user_request.prosperity_current * (user_request.crime_rate_current * user_request.prosperity_growth / 10000 * 4);
                let user_prosperity_current_base_random_value = Math.trunc(user_prosperity_current_increase / 4);
                let user_prosperity_current_random = get_random_number(-1 * user_prosperity_current_base_random_value, user_prosperity_current_base_random_value);

                user_request.prosperity_current += user_prosperity_current_increase;
                user_request.prosperity_current += user_prosperity_current_random;
                user_request.prosperity_current -= user_prosperity_current_decrease;

                if(user_request.prosperity_current < 0){
                    user_request.prosperity_current = 0;
                };

                if(user_request.prosperity_current > user_request.prosperity_max){
                    user_request.prosperity_current = user_request.prosperity_max;
                };

                // console.log(`Crime Rate Decrease    : ${random_crime_rate_decrease}`);
                // console.log()
                // console.log(`People Increase        : ${user_people_current_increase}`);
                // console.log(`People Decrease        : ${user_people_current_decrease}`);
                // console.log(`People Base Random     : ${user_people_current_base_random_value}`);
                // console.log(`People Random          : ${user_people_current_random}`);
                // console.log()
                // console.log(`Prosperity Increase    : ${user_prosperity_current_increase}`);
                // console.log(`Prosperity Decrease    : ${user_prosperity_current_decrease}`);
                // console.log(`Prosperity Base Random : ${user_prosperity_current_base_random_value}`);
                // console.log(`Prosperity Random      : ${user_prosperity_current_random}`);
            }

            res.redirect('/home');
        }

        user_request.people_current = Math.trunc(user_request.people_current);
        user_request.prosperity_current = Math.trunc(user_request.prosperity_current);
        user_request.crime_rate_current = Math.trunc(user_request.crime_rate_current);
        user_request.money_current = Math.trunc(user_request.money_current);

        User.findOneAndUpdate({id: user_request.id}, {
            people_current: user_request.people_current,
            people_max: user_request.people_max,
            people_growth: user_request.people_growth,
            prosperity_current: user_request.prosperity_current,
            prosperity_max: user_request.prosperity_max,
            prosperity_growth: user_request.prosperity_growth,
            crime_rate_current: user_request.crime_rate_current,
            crime_rate_max: user_request.crime_rate_max,
            money_current: user_request.money_current,
            money_max: user_request.money_max,
            money_growth: user_request.money_growth,
            upgrades: user_request.upgrades,
            crime_case_correct: user_request.crime_case_correct,
            crime_case_taken: user_request.crime_case_taken,
            crime_case: user_request.crime_case
        })

        .then(() =>{
            console.log(`Saving User ${user_request.id} Data`);   
        })

        .catch((err) => {
            console.log(err);
        });
    });

    app.get('/information', check_authenticated, (req: Request, res: Response) => {
        res.render('information', { title: 'Informasi', user_data: req.user, case_datas, upgrade_datas });
    });

    app.get('/upgrade', check_authenticated, (req: Request, res: Response) => {
        res.render('upgrade', { title: 'Peningkatan', user_data: req.user, upgrade_datas });
    });

    app.post('/upgrade', check_authenticated, (req: Request, res: Response) => {
        let post_upgrade_stat_id = parseInt(req.body.stat_id);
        let post_upgrade_upgrade_id = parseInt(req.body.upgrade_id);
        let post_upgrade_type = req.body.type;
        let post_upgrade_amount = parseInt(req.body.amount);
        let post_upgrade_cost = parseInt(req.body.cost);

        let user_request: any = req.user;

        if(post_upgrade_cost <= user_request.money_current){
            if(post_upgrade_type == 'Max'){
                if(post_upgrade_stat_id == 1){
                    user_request.people_max += post_upgrade_amount;
                }

                else if(post_upgrade_stat_id == 2){
                    user_request.prosperity_max += post_upgrade_amount;
                }

                else if(post_upgrade_stat_id == 3){
                    user_request.money_max += post_upgrade_amount;
                };
            }

            else if(post_upgrade_type == 'Growth'){
                if(post_upgrade_stat_id == 1){
                    user_request.people_growth += post_upgrade_amount;
                }

                else if(post_upgrade_stat_id == 2){
                    user_request.prosperity_growth += post_upgrade_amount;
                }

                else if(post_upgrade_stat_id == 3){
                    user_request.money_growth += post_upgrade_amount;
                };  
            };
            
            user_request.money_current -= post_upgrade_cost;
            user_request.upgrades[post_upgrade_stat_id - 1][post_upgrade_upgrade_id - 1][1] += 1;
        }
        
        res.redirect('/upgrade');

        User.findOneAndUpdate({id: user_request.id}, {
            people_current: user_request.people_current,
            people_max: user_request.people_max,
            people_growth: user_request.people_growth,
            prosperity_current: user_request.prosperity_current,
            prosperity_max: user_request.prosperity_max,
            prosperity_growth: user_request.prosperity_growth,
            crime_rate_current: user_request.crime_rate_current,
            crime_rate_max: user_request.crime_rate_max,
            money_current: user_request.money_current,
            money_max: user_request.money_max,
            money_growth: user_request.money_growth,
            upgrades: user_request.upgrades,
            crime_case_correct: user_request.crime_case_correct,
            crime_case_taken: user_request.crime_case_taken,
            crime_case: user_request.crime_case
        })

        .then(() =>{
            console.log(`Resetting User ${user_request.id} Data`);
        })

        .catch((err) => {
            console.log(err);
        });
    });

    app.get('/history', check_authenticated, (req: Request, res: Response) => {
        res.render('history', { title: 'Berita', user_data: req.user });
    });

    app.get('/setting', check_authenticated, (req: Request, res: Response) => {
        res.render('setting', { title: 'Pengaturan', user_data: req.user });
    });

    app.post('/setting', check_authenticated, (req: Request, res: Response) => {
        if(req.body.type == 'reset'){
            const random_case_max: number = get_random_number(1, 2);
            let random_case_theme: any = get_random_case();
            let random_case_identity: any = get_random_case_identity(random_case_theme)

            let user_request: any = req.user;
            user_request.people_current = 80;
            user_request.people_max = 100;
            user_request.people_growth = 10;
            user_request.prosperity_current = 90;
            user_request.prosperity_max = 100;
            user_request.prosperity_growth = 10;
            user_request.crime_rate_current = 20;
            user_request.crime_rate_max = 100;
            user_request.money_current = 100;
            user_request.money_max = 1000;
            user_request.money_growth = 5;
            user_request.upgrades = [
                [[1, 1], [2, 1], [3, 1], [4, 1]],
                [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]],
                [[1, 1], [2, 1]]
            ],
            user_request.crime_case_correct =  0,
            user_request.crime_case_taken = [random_case_theme];
            user_request.crime_case = [
                {
                    "day": 1,
                    "case_current" : 0,
                    "case_max" : random_case_max,
                    "case": [
                        {
                            "case_id": random_case_theme,  
                            "case_response": null,
                            "case_identity" : random_case_identity
                        }
                    ]
                }
            ]

            res.redirect('/home');
        }
        
        let user_request: any = req.user;
        User.findOneAndUpdate({id: user_request.id}, {
            people_current: user_request.people_current,
            people_max: user_request.people_max,
            people_growth: user_request.people_growth,
            prosperity_current: user_request.prosperity_current,
            prosperity_max: user_request.prosperity_max,
            prosperity_growth: user_request.prosperity_growth,
            crime_rate_current: user_request.crime_rate_current,
            crime_rate_max: user_request.crime_rate_max,
            money_current: user_request.money_current,
            money_max: user_request.money_max,
            money_growth: user_request.money_growth,
            upgrades: user_request.upgrades,
            crime_case_correct: user_request.crime_case_correct,
            crime_case_taken: user_request.crime_case_taken,
            crime_case: user_request.crime_case
        })

        .then(() =>{
            console.log(`Resetting User ${user_request.id} Data`)   
        })

        .catch((err) => {
            console.log(err)
        })
    });

    app.get('/contributor', check_authenticated, (req: Request, res: Response) => {
        res.render('contributor', { title: 'Kontributor', user_data: req.user });
    });

    //#endregion Main Request

    //#region Authentication Request
    app.get('/login', check_not_authenticated, (req: Request, res: Response) => {
        res.render('login', { title: 'Login' });
    });

    app.post('/login', check_not_authenticated, passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    }));

    app.get('/register', check_not_authenticated, (req: Request, res: Response) => {
        res.render('register', { title: 'Register' });
    });

    app.post('/register', check_not_authenticated, async (req: Request, res: Response) => {
        let username_not_taken = true;
        for(let i = 0; i < user_datas.length; i++){
            if(String(req.body.username) == user_datas[i].username){
                username_not_taken = false;
                break;
            }
        };

        let password_error_message = [];

        let password_has_uppercase = true;
        if(req.body.password.match(/[A-Z]/u) == null){
            password_has_uppercase = false;
            password_error_message.push('huruf besar');
        };

        let password_has_lowercase = true;
        if(req.body.password.match(/[a-z]/u) == null){
            password_has_lowercase = false;
            password_error_message.push('huruf kecil');
        };

        let password_has_number = true;
        if(req.body.password.match(/[0-9]/u) == null){
            password_has_number = false;
            password_error_message.push('angka');
        };

        let password_has_special = true;
        if(req.body.password.match(special_char) == null){
            password_has_special = false;
            password_error_message.push('simbol special');
        };

        let password_length = true;
        if(req.body.password.length < 8){
            password_length = false;
            password_error_message.push('setidaknya 8 karakter');
        };

        let has_no_error = true;
        if(!username_not_taken || !password_length || !password_has_uppercase || !password_has_lowercase || !password_has_number || !password_has_special){
            has_no_error = false;
        }

        if(has_no_error){
            const hashedPassword: any = await bcrypt.hash(req.body.password, 12);
            const random_case_max: number = get_random_number(1, 2);

            let random_case_theme: any = get_random_case();

            let random_case_identity: any = get_random_case_identity(random_case_theme)

            let new_user_dictionary = {
                "id": user_datas.length + 1,
                "username": String(req.body.username),
                "password": hashedPassword,
                "people_current": 80,
                "people_max": 100,
                "people_growth": 10,
                "prosperity_current": 90,
                "prosperity_max": 100,
                "prosperity_growth": 10,
                "crime_rate_current": 20,
                "crime_rate_max": 100,
                "money_current": 100,
                "money_max": 1000,
                "money_growth": 5,
                "upgrades": [
                    [[1, 1], [2, 1], [3, 1], [4, 1]],
                    [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]],
                    [[1, 1], [2, 1]]
                ],
                "crime_case_correct": 0,
                "crime_case_taken" : [random_case_theme],
                "crime_case": [
                    {
                        "day": 1,
                        "case_current" : 0,
                        "case_max" : random_case_max,
                        "case": [
                            {
                                "case_id": random_case_theme,  
                                "case_response": null,
                                "case_identity" : random_case_identity
                            }
                        ]
                    }
                ]
            }

            user_datas.push(new_user_dictionary);
            const new_user = new User(new_user_dictionary)
            new_user.save()
                .catch((err: any) => console.log(err))

            res.redirect('/login');
        }

        else if(!has_no_error){
            let flash_error_string: string = '';

            if(!username_not_taken){
                flash_error_string = 'Username sudah diambil';
            }

            else if(!password_length || !password_has_uppercase || !password_has_lowercase || !password_has_number || !password_has_special){
                flash_error_string = 'Password harus memiliki ';
                
                for(let i = 0; i < password_error_message.length; i++){
                    flash_error_string = flash_error_string + password_error_message[i];

                    if(password_error_message.length > 1 ){
                        if(i != password_error_message.length - 1){
                            flash_error_string = flash_error_string + ', '
                        }

                        if(i == password_error_message.length - 2){
                            flash_error_string = flash_error_string + ' dan '
                        }
                    }
                }
            }

            flash_error_string = flash_error_string + '!'

            req.flash('info', flash_error_string);
            res.redirect('/register');
        }
    });

    app.get('/logout', check_authenticated, (req: Request, res: Response) => {
        res.render('logout', { title: 'Logout' });
    });

    app.delete('/logout', check_authenticated, (req: Request, res: Response) => {
        req.logOut();
        res.redirect('/login');
    });

    //#endregion Authentication Request
    
}

const port: any = process.env.PORT || 5000;
const special_char: any = /[!-#%-*,-\/:;?@[-\]_{}\u00A1\u00A7\u00AB\u00B6\u00B7\u00BB\u00BF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4E\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65\u{10100}-\u{10102}\u{1039F}\u{103D0}\u{1056F}\u{10857}\u{1091F}\u{1093F}\u{10A50}-\u{10A58}\u{10A7F}\u{10AF0}-\u{10AF6}\u{10B39}-\u{10B3F}\u{10B99}-\u{10B9C}\u{10F55}-\u{10F59}\u{11047}-\u{1104D}\u{110BB}\u{110BC}\u{110BE}-\u{110C1}\u{11140}-\u{11143}\u{11174}\u{11175}\u{111C5}-\u{111C8}\u{111CD}\u{111DB}\u{111DD}-\u{111DF}\u{11238}-\u{1123D}\u{112A9}\u{1144B}-\u{1144F}\u{1145B}\u{1145D}\u{114C6}\u{115C1}-\u{115D7}\u{11641}-\u{11643}\u{11660}-\u{1166C}\u{1173C}-\u{1173E}\u{1183B}\u{11A3F}-\u{11A46}\u{11A9A}-\u{11A9C}\u{11A9E}-\u{11AA2}\u{11C41}-\u{11C45}\u{11C70}\u{11C71}\u{11EF7}\u{11EF8}\u{12470}-\u{12474}\u{16A6E}\u{16A6F}\u{16AF5}\u{16B37}-\u{16B3B}\u{16B44}\u{16E97}-\u{16E9A}\u{1BC9F}\u{1DA87}-\u{1DA8B}\u{1E95E}\u{1E95F}]/u;
const list_of_name: any = {
    "male": ["Putra", "Wahyu", "Agus", "Agung", "Ahmad", "Kurniawan", "Budi", "Adi", "Eko", "Arief", "Ari", "Indra", "Rizki", "Yusuf", "Fajar", "Bayu", "Aditya", "Nugroho", "Abdul", "Setiawan", "Riski", "Bagus", "Hidayat", "Rian", "Hendra", "Raden", "Surya", "Angga", "Hadi", "Adam", "Rudi", "Andri", "Taufik", "Hanif"],
    "female": ["Nur", "Dewi", "Dian", "Sri", "Putri", "Sari", "Ayu", "Indah", "Siti", "Fitri", "Ratna", "Puspita", "Ratih", "Pratiwi", "Tika", "Wulandari", "Lestari", "Febri", "Anita", "Rahma", "Fitria", "Novi", "Ria", "Rahayu", "Yunita", "Rina", "Widya", "Intan", "Agustina", "Rini", "Yulia", "Maya", "Utami", "Amel", "Devi", "Citra", "Diana", "Wulan", "Yuni", "Sinta", "Cantika"]
};

const dbURI: any = process.env.dbURI
mongoose.connect(process.env.MONGODB_URI || dbURI)
    .then(() => {
        app.listen(port, () => {console.log(`Listening in http://localhost:${port}`)})
        find_data()
    })

    .catch((err) => console.log(err))