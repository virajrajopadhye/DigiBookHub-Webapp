var express    = require("express");
var bodyParser = require('body-parser');
const BUCKET_NAME = process.env.S3BUCKET_NAME; 
const path = require('path');
var fs = require('fs-extra');
var formidable = require('formidable');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
var http = require('http');
var connection = require('./database');
const models = require('./models');
const user = models.Users;
var multer = require('multer');
var multerS3 = require('multer-s3');
const aws = require('aws-sdk'); 
const logger = require('pino')('./logs/info.log');
var StatsD = require('node-statsd'),
client = new StatsD();
aws.config.update({region: 'us-east-1'});
const helpers = require('./helper');



const app = express();
app.use(express.urlencoded({extended:false}));

//view and view engine
app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(express.static(__dirname + '/public'));

// APPLY COOKIE SESSION MIDDLEWARE
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge:  3600 * 1000 // 1hr
}));

app.use(function(req, res, next) {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
  });
module.exports={
//to check whether user has logged in or not
 ifNotLoggedIn: ifNotLoggedin = (req, res, next) => {
    logger.info("home page");
    if(!req.session.isLoggedIn){
       
        return res.render('login-register');
    }
    next();
}
//if user is already logged in
,ifLoggedIn: ifLoggedin = (req,res,next) => {
    logger.info("home page");
    if(req.session.isLoggedIn){
        return res.redirect('/home');
    }
    next();
}


,myData: function myData() { 
    
    return 123; 
 }


,home: app.get('/', ifNotLoggedin, (req,res,next) => {
    
    logger.info("home page");

    models.Users.findAll({where: {id:req.session.id}
                
            }).then(([user]) => {
        res.render('home',{
            name:user.firstName
        });
    });
    
})

,server: app.listen(3000, () => console.log("Server is Running..."))
}



// REGISTER PAGE
app.post('/register', ifLoggedin, 
// post data validation(using express-validator)
[
    body('user_email','Invalid email address!').isEmail().custom((value) => {
  
      models.Users.findAll({limit: 1, where: {email:value}});
      
         
      return models.Users.findAll({where: {email:value}}).then(([user]) => {
         
            if(user!=null){
                logger.warn('Invalid email');
                return Promise.reject('This E-mail already in use!');
            }
            return true;
        });
    }),
    body('user_fname','First Name is Empty!').trim().not().isEmpty(),
    body('user_lname','Last Name is Empty!').trim().not().isEmpty(),
    
    body('user_pass','The password must be of minimum length 8 characters, must contain uppercase, lowercase, special character and number').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/),
],
(req,res,next) => {
    logger.info("Register API is hit");
    
    const validation_result = validationResult(req);
    const {user_fname,user_lname, user_pass, user_email} = req.body;
    const saltRounds = 10;

    // IF validation_result HAS NO ERROR
    if(validation_result.isEmpty()){
        const Start_time=new Date().getTime();
        // password encryption (using bcrypt)
        bcrypt.hash(user_pass, saltRounds).then((hash_pass) => {
            user = models.Users.create({
                firstName:user_fname,
                lastName:user_lname,
                email:user_email,
                password:hash_pass
            }).then(result => {
                const end_time=new Date().getTime();
                const final_time=end_time-Start_time;
                client.timing('register', final_time);
                res.send(`your account has been created successfully, Now you can <a href="/">Login</a>`);
            }).catch(err => {
                // THROW INSERTING USER ERROR'S
                if (err) throw err;
            });
        })
        .catch(err => {
            // THROW HASING ERROR'S
            if (err) throw err;
        })
    }
    else{
        // COLLECT ALL THE VALIDATION ERRORS
        let allErrors = validation_result.errors.map((error) => {
            console.log(error);
            return error.msg;
            
        });
        // REDERING login-register PAGE WITH VALIDATION ERRORS
        res.status(400).render('login-register',{
            register_error:allErrors,
            old_data:req.body
        });
    }
});// END OF REGISTER PAGE


// LOGIN PAGE
app.post('/', ifLoggedin, [
    body('user_email').custom((value) => {
    //  console.log(value);
        // connection.execute('SELECT `email` FROM `usersTable` WHERE `email`=?', [value])
     return models.Users.findAll({where: {email:value}
                
        })
        .then(([user]) => {
           // console.log(user.email);
            if(user!=null){
               // console.log("we are here")
                return true;
                
            }
            return Promise.reject('Invalid Email Address!');
            
        });
    }),
    body('user_pass','Password is empty!').trim().not().isEmpty(),
], (req, res) => {
    logger.info("Login API is hit");
    const validation_result = validationResult(req);
    const {user_pass, user_email} = req.body;
    //console.log(validation_result);
    if(validation_result.isEmpty()){
        const Start_time=new Date().getTime();
        // connection.execute("SELECT * FROM `Users` WHERE `email`=?",[user_email])
        
        models.Users.findAll({where: {email:user_email}}).then(([user]) => {
            
            bcrypt.compare(user_pass, user.password).then(compare_result => {
                if(compare_result === true){
                    req.session.isLoggedIn = true;
                    req.session.id= user.id;
                    const end_time=new Date().getTime();
                    const final_time=end_time-Start_time;
                    client.timing('successfull_login', final_time);
                    res.redirect('/');
                }
                else{
                    res.render('login-register',{
                        login_errors:['Invalid Password!']
                    });
                }
            })
            .catch(err => {
                if (err) throw err;
            });


        }).catch(err => {
            if (err) throw err;
        });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
        res.render('login-register',{
            login_errors:allErrors
        });
    }
});
// END OF LOGIN PAGE




//VIEW DETAILS
app.get('/view',(req,res)=>{
    logger.info("View Details API is hit");
    var Start_time = new Date().getTime(); 

    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }
    else{
       
    connection.execute("SELECT `firstName`,`lastName`,`email` FROM `Users` WHERE `id`=?",[req.session.id])
        .then(([rows]) => {
            res.render('viewDetails',{
                fname:rows[0].firstName,
                lname:rows[0].lastName,
                email:rows[0].email
            });
        });
    }
    var end_time=new Date().getTime();
    var final_time=end_time-Start_time;
    client.timing('time_to_view_profile', final_time);
});

//VIEW DETAILS END




app.get('/update',(req,res)=>{
    logger.info("Update User Details API is hit");

    if(!req.session.isLoggedIn){
        logger.warn('Null Session');
        res.redirect('/');
    }
    else
   {
    connection.execute("SELECT `firstName`,`lastName`,`password` FROM `Users` WHERE `id`=?",[req.session.id])
        .then(([rows]) => {
            res.render('update',{
                fname:rows[0].firstName,
                lname:rows[0].lastName,
                password:rows[0].password,
                
                
            });
            
        });

}
    
});








//UPDATE
app.post('/updateDetails', ifNotLoggedin, 
// post data validation(using express-validator)
[
    body('user_fname','First Name is Empty!').trim().not().isEmpty(),
    body('user_lname','Last Name is Empty!').trim().not().isEmpty(),
    //body('user_pass','The password must be of minimum length 6 characters').trim().isLength({ min: 8 }),
    body('user_pass','The password must be of minimum length 8 characters, must contain uppercase, lowercase, special character and number').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/),
],// end of post data validation



(req,res,next) => {

    const validation_result = validationResult(req);
    const {user_fname,user_lname, user_pass} = req.body;
    const saltRounds = 10;
    const id = req.session.id;

    // IF validation_result HAS NO ERROR
    if(validation_result.isEmpty()){
        const Start_time=new Date().getTime();
        // password encryption (using bcrypt)
        bcrypt.hash(user_pass, saltRounds).then((hash_pass) => {
            // INSERTING USER INTO DATABASE
            connection.execute("UPDATE `Users` SET `firstName`=?,`lastName`=?,`password`=? WHERE `id`=?",[user_fname, user_lname, hash_pass,id])
            .then(result => {
                const end_time=new Date().getTime();
                const final_time=end_time-Start_time;
                client.timing('update_user_details', final_time);
                res.send(`your account has been updated successfully, Now you can <a href="/view">View</a>`);
            }).catch(err => {
                // THROW INSERTING USER ERROR'S
                if (err) throw err;
            });
        })
        .catch(err => {
            // THROW HASING ERROR'S
            if (err) throw err;
        })
    }
    else{
        // COLLECT ALL THE VALIDATION ERRORS
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH VALIDATION ERRORS
        res.render('update',{
            register_error:allErrors,
            old_data:req.body
        });
    }
});



app.get('/seller',(req,res)=>{
    logger.info("Seller API is hit");

    if(!req.session.isLoggedIn){
        logger.warn('Null Session');
        res.redirect('/');
    }
    else{
        
        const Start_time=new Date().getTime();
        connection.execute("SELECT `ISBN`,`title`,`authors`,`publicationDate` FROM `Books`").then(([books]) => {
        const end_time=new Date().getTime();
        const final_time=end_time-Start_time;
        client.timing('seller_home_page', final_time);
            res.render('sellerhome',{books:books});
         });
    }
});

//BUYER Home PAGE
app.get('/buyer',(req,res)=>{
    logger.info("Buyer API is hit");
    var timer = new Date().getTime();
    logger.info('StartTime: '+timer);

    if(!req.session.isLoggedIn){
        logger.warn('Null Session');
        res.redirect('/');
    }
    else{
    
    client.increment('view_book_listing');  

    connection.execute("select firstName, sellerId, ISBN, title,authors,quantity,price,publicationDate from Users join SellerBooks on Users.id=SellerBooks.sellerId where sellerId!=? and quantity!=0 order by price",[req.session.id]).then(([sellerbooks]) => {
        res.render('buyerhome',{sellerbooks:sellerbooks});
         
      });

   
    }
    var end_time = new Date().getTime();
    logger.info('End time:'+end_time)
    var final_time = end_time-timer; 
    logger.info('final_time: '+final_time);
    client.timing('time_to_list_books', final_time);
});
//BUYER Home PAGE END




// Add New Book
app.post('/addNewBook',  
// post data validation(using express-validator)
[
    body('ISBN').custom((value) => {
   
      models.Book.findAll({limit: 1, where: {ISBN:value}});
  
         
      return models.Book.findAll({where: {ISBN:value}}).then(([book]) => {
         
            if(book!=null){
                logger.warn('Book exist');
                return Promise.reject('Book already exist');
                
            }
            return true;
        });
    }),
    body('ISBN','ISBN is Empty!').trim().not().isEmpty(),
    body('title','Title is Empty!').trim().not().isEmpty(),
    body('authors','Authors is Empty!').trim().not().isEmpty(),
    
   
],
(req,res,next) => {
    logger.info("Add Book API is hit");
    const validation_result = validationResult(req);
    const {ISBN,title, authors, publicationDate} = req.body;
    
    // IF validation_result HAS NO ERROR
    if(validation_result.isEmpty()){
        const Start_time=new Date().getTime();
       
            book = models.Book.create({
                ISBN:ISBN,
                title:title,
                authors:authors,
                publicationDate:publicationDate,

                
            }).then(result => {
                const end_time=new Date().getTime();
                const final_time=end_time-Start_time;
                client.timing('addNewBook', final_time);
                res.send(`book has been added successfully, Now you can <a href="/seller">View</a>`);
            }).catch(err => {
                // THROW INSERTING USER ERROR'S
                if (err) throw err;
            });
       
    }
    else{
        // COLLECT ALL THE VALIDATION ERRORS
       let allErrors = validation_result.errors.map((error) => {
                console.log(error);
                return error.msg;
                
            });

            connection.execute("SELECT `ISBN`,`title`,`authors`,`publicationDate` FROM `Books`").then(([books]) => {
                
                    res.render('sellerhome', {register_error:allErrors, old_data:req.body ,books:books});
                    
                 });
    }
});// END OF add new book


//Add book in sellerBook table
app.post('/addSellerBook',  
// post data validation(using express-validator)
[
    body('ISBNMain').custom((value) => {
    return models.Book.findAll({where: {ISBN:value}}).then(([book]) => {
         
            if(book==null){
                logger.warn('Null Book');
                return Promise.reject('Book doesnt exist, Please add a new book and continue');
                
            }
            return true;
        });
    }),

   

    body('ISBNMain','ISBN is Empty!').trim().not().isEmpty(),
    body('quantity','Quantity is Empty!').trim().not().isEmpty(),
    body('price','price is Empty!').trim().not().isEmpty(),
    body('price', 'price must be greater than 0').isFloat({ gt: 0.0 })
    
   
],
(req,res,next) => {
    logger.info("addSellerBook API is hit");
    const {ISBNMain,quantity, price} = req.body;
    models.SellerBooks.findAll({where: {ISBN:ISBNMain,sellerId:req.session.id}}).then(([book]) => {
         
        if(book!=null){
            logger.warn('Book already added');
            res.send(`You have already added the book, Now you can <a href="/seller">View</a>`);
            
        }
        else{
        const validation_result = validationResult(req);
  // IF validation_result HAS NO ERROR
                    if(validation_result.isEmpty()){

                        const Start_time=new Date().getTime();
                        models.Book.findAll({where: {ISBN:ISBNMain}}).then(([book]) => {
                        const title=book.title
                        const authors=book.authors
                        const publicationDate=book.publicationDate


                            sellerbook = models.SellerBooks.create({
                            ISBN:ISBNMain,
                            title:title,
                            authors:authors,
                            publicationDate:publicationDate,
                            quantity:quantity,
                            price: price,
                            sellerId:req.session.id
                        
                    });
                        console.log(title, authors, publicationDate);
                    
                            }).then(result => {
                                logger.info('Book added in seller table');
                                const end_time=new Date().getTime();
                                const final_time=end_time-Start_time;
                                client.timing('addSellerBook', final_time);
                                res.send(`book has been successfully listed, Now you can <a href="/seller">View</a>`);
                            }).catch(err => {
                                // THROW INSERTING USER ERROR'S
                                if (err) throw err;
                            });
                        
                    
                    }
                    else{
                        // COLLECT ALL THE VALIDATION ERRORS
                                let allErrors = validation_result.errors.map((error) => {
                                console.log(error);
                                return error.msg;
                                
                            });

                            connection.execute("SELECT `ISBN`,`title`,`authors`,`publicationDate` FROM `Books`").then(([books]) => {
                                
                                    res.render('sellerhome', {book_error:allErrors, old_data1:req.body ,books:books});
                                    
                                });
                    }
            }
    });

 
    
});// END OF add new book


//MyListings START
app.get('/myListings',(req,res)=>{
    logger.info("Seller Book Listing API is hit");
    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }
    else{
        
        
    const Start_time=new Date().getTime();
    connection.execute('select * from SellerBooks where sellerId=?',[req.session.id]).then(([sellerallbooks]) => {
        if(sellerallbooks==null){
            res.send(`You Dont have any Listings, Add some books <a href="/seller">Here</a>`);
        }
        else{
        const end_time=new Date().getTime();
        const final_time=end_time-Start_time;
        client.timing('seller_listings', final_time);
        res.render('sellerslistings',{sellerallbooks:sellerallbooks});
    }
      });

   
    }
});

//MYLISTINGS END

//Update Book Begin

app.post('/updateBook',(req,res)=>{
    logger.info("Update book API is hit");

    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }
    else{
        const Start_time=new Date().getTime();
        const {ISBN}=req.body;

        connection.execute('select * from SellerBooks where sellerId=? and ISBN=?',[req.session.id,ISBN]).then(([sellerallbooks]) => {
        if(sellerallbooks==null){
            res.send(`You Dont have any Listings, Add some books <a href="/seller">Here</a>`);
        }
        else{
        const end_time=new Date().getTime();
        const final_time=end_time-Start_time;
        client.timing('updatebook', final_time);
        res.render('updateBook',{sellerallbooks:sellerallbooks});
        }
      });

   
    }
});



app.post('/updatebookstatus',  
// post data validation(using express-validator)
[

   
    body('quantity','Quantity is Empty!').trim().not().isEmpty(),
    body('price','price is Empty!').trim().not().isEmpty(),
    body('price', 'price must be greater than 0').isFloat({ gt: 0.0 })
    
    
   
],
(req,res,next) => {
    const {ISBNMain,quantity, price} = req.body;
  
         
      
        const validation_result = validationResult(req);
        // IF validation_result HAS NO ERROR
                    if(validation_result.isEmpty()){
                    const Start_time=new Date().getTime();
                        
                      models.Cart.findAll({where:{sellerId:req.session.id,ISBN:ISBNMain}}).then(([book])=>{

                        

                      
                        connection.execute('update SellerBooks set quantity=?, price=?,updatedAt=NOW() where sellerId=? and ISBN=?',[quantity,price,req.session.id,ISBNMain]).then(() => {
                            if(book!=null){
                            const totalAmt=parseInt(book.quantityBought)*price;
                            connection.execute('update Carts set price=?, totalAmt=?,updatedAt=NOW() where sellerId=? and ISBN=?',[price,totalAmt,req.session.id,ISBNMain]).then(() => {
                                
                                //res.send(`book has been updated successfully. Now you can <a href="/myListings">View</a>`);
                            });

                        }
                        const end_time=new Date().getTime();
                        const final_time=end_time-Start_time;
                        client.timing('update_seller_books', final_time);
                        res.send(`book has been updated successfully. Now you can <a href="/myListings">View</a>`);
                                }).catch(err => {
                            // THROW INSERTING USER ERROR'S
                            if (err) throw err;
                        });
                    });  
                    }
                    else{
                        // COLLECT ALL THE VALIDATION ERRORS
                    let allErrors = validation_result.errors.map((error) => {
                                console.log(error);
                                return error.msg;
                                
                            });

                            connection.execute("select * from SellerBooks where sellerId=? and ISBN=?",[req.session.id,ISBNMain]).then(([sellerallbooks]) => {
                                
                                    res.render('updateBook', {book_error:allErrors, old_data1:req.body, sellerallbooks:sellerallbooks});
                                    
                                });
                    }
            
});





//Add Cart Beginf
app.post('/addToCart',(req,res)=>{
    const webRequestStartTime =  new Date().getTime();
    logger.info("Add to cart API is hit");
    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }
    else{
                const Start_time=new Date().getTime();
                const {sellerId,quantityBought,cartISBN} = req.body;
                
                models.SellerBooks.findAll({where: {sellerId:sellerId,ISBN:cartISBN}}).then(([sellerBook]) => {

                const title=sellerBook.title
                const authors=sellerBook.authors
                const publicationDate=sellerBook.publicationDate
                const price=sellerBook.price
                const totalAmt=parseFloat(price)*parseFloat(quantityBought);
                const quantity=sellerBook.quantity
                const remainingQuantity= quantity-quantityBought;
                


                    models.Cart.findAll({where:{ISBN:cartISBN,buyerId:req.session.id,sellerId:sellerId}}).then(([alreadybook])=> {
                        if(alreadybook!=null){
                            const cumulative = parseInt(alreadybook.quantityBought)+parseInt(quantityBought);
                            const totalAmt2=parseFloat(price)*parseFloat(cumulative);
                            connection.execute("update Carts set quantityBought=?,totalAmt=?,updatedAt=NOW() where ISBN=? and buyerId=? and sellerId=?",[cumulative,totalAmt2,cartISBN,req.session.id,sellerId]).then(([books]) => {
                                const rem = quantity-cumulative;
                                connection.execute("update SellerBooks set quantity=?,updatedAt=NOW() where ISBN=? and sellerId=?",[remainingQuantity,cartISBN,sellerId]).then(([books]) => {
                                                
                                    res.send('Books have been added to cart. <a href="/viewcart">View Cart</a>')
                                    
                                });
                                
                            });
                
                        }
                        else{

                                book = models.Cart.create({
                                ISBN:cartISBN,
                                title:title,
                                authors:authors,
                                
                                quantityBought:quantityBought,
                                price: price,
                                publicationDate:publicationDate,
                                buyerId:req.session.id,
                                sellerId:sellerId,
                                totalAmt:totalAmt
                            })
                            connection.execute("update SellerBooks set quantity=?, updatedAt=NOW() where ISBN=? and sellerId=?",[remainingQuantity,cartISBN,sellerId]).then(([books]) => {
                                const end_time=new Date().getTime();
                                const final_time=end_time-Start_time;
                                client.timing('add_book_cart', final_time);
                        
                                res.send('Books have been added to cart. <a href="/viewcart">View Cart</a>')
                                
                            });
                        }
                    
                    })

                


            
                });
                const webRequestEndTime=new Date().getTime();
                const webRequestfinalTime=webRequestEndTime-webRequestStartTime;
                client.timing('Add_Cart_API', webRequestfinalTime);
    }
});


//View cart
app.get('/viewcart',(req,res)=>{
    const webRequestStartTime =  new Date().getTime();
    logger.info("View Cart API is hit");
    if(!req.session.isLoggedIn){
        logger.warn('session is null');
        res.redirect('/');
    }
    else{
        
        

            connection.execute('select * from Carts where buyerId=?',[req.session.id]).then(([cartbook]) => {
            if(cartbook==null){
                res.send(`Your Cart is empty <a href="/buyer">Buy Some Books</a>`);
            }
                else{
                    //console.log(cartbook);
                res.render('cart',{cartbook:cartbook});
            }
      });
       
      const webRequestEndTime=new Date().getTime();
      const webRequestfinalTime=webRequestEndTime-webRequestStartTime;
      client.timing('View_Cart_API', webRequestfinalTime);
    }
});

app.post('/updateCartBook',(req,res)=>{
    logger.info("Update Cart Book API is hit");
    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }
    else{
        
        
        const{sellerId,ISBN,quantityBought}=req.body;
        connection.execute('select * from SellerBooks where sellerId=? and ISBN=?',[sellerId,ISBN]).then(([cartbook]) => {
            if(cartbook==null){
                res.send(`Your Cart is empty <a href="/buyer">Buy Some Books</a>`);
            }
                else{
                    //console.log(cartbook);
                res.render('updateCartBook',{cartbook:cartbook,quantityBought:quantityBought});
            }
      });

   
    }
});

app.post('/updateBookInCart',(req,res)=>{
    const webRequestStartTime =  new Date().getTime(); 
    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }
    else{
        
    const Start_time=new Date().getTime();
    const{sellerId,ISBN,newquantity,price,previousquantity}=req.body;
    connection.execute('select * from SellerBooks where sellerId=? and ISBN=?',[sellerId,ISBN]).then(([cartbook]) => {
        if(cartbook==null){
            res.redirect('/viewcart');
        }
        else{
        const quantityleftwithseller= cartbook.quantity;
        const cumulative= parseFloat(price)*parseFloat(newquantity);
        if(parseInt(newquantity)>=parseInt(previousquantity)){
            const extraquantity= parseInt(newquantity)-parseInt(previousquantity);
            connection.execute('update Carts set totalAmt=?, quantityBought=? where sellerId=? and ISBN=? and buyerId=?',[cumulative,newquantity,sellerId,ISBN,req.session.id]).then(()=>{
                connection.execute('update SellerBooks set quantity=quantity-? where sellerId=? and ISBN=?',[extraquantity,sellerId,ISBN]).then(()=>{
                    res.send('Your cart has been updated successfully. <a href="/viewcart">View Your Cart</a>');
                })
                
            })
        }
        else{
            const extraquantity= parseInt(previousquantity)-parseInt(newquantity);
            connection.execute('update Carts set totalAmt=?, quantityBought=? where sellerId=? and ISBN=? and buyerId=?',[cumulative,newquantity,sellerId,ISBN,req.session.id]).then(()=>{
                connection.execute('update SellerBooks set quantity=quantity+? where sellerId=? and ISBN=?',[extraquantity,sellerId,ISBN]).then(()=>{
                    res.send('Your cart has been updated successfully. <a href="/viewcart">View Your Cart</a>');
                })
                
            })
        }
          
        const end_time=new Date().getTime();
        const final_time=end_time-Start_time;
        client.timing('update_book_cart', final_time);
        
        }
      });

   
    }

        const webRequestEndTime=new Date().getTime();
        const webRequestfinalTime=webRequestEndTime-webRequestStartTime;
        client.timing('update_book_API', webRequestfinalTime);
});




//Delete cart
app.post('/delete',(req,res)=>{
    logger.info("Delete from cart API is hit");
    const Start_time=new Date().getTime();
    const {ISBN,confirm,sellerId,quantityBought} = req.body;    
    //console.log(ISBN);
    console.log(confirm)

    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }
    else if(parseInt(confirm)===0){
        res.redirect('/viewcart')
       
    }
    else {
        
   connection.execute('delete from Carts where buyerId=? and ISBN=? and sellerId=?',[req.session.id,ISBN,sellerId]).then(([cartbook]) => {
       connection.execute('update SellerBooks set quantity=quantity+?, updatedAt=NOW() where ISBN=? and sellerID=?',[quantityBought,ISBN,sellerId]).then(()=>{
        const end_time=new Date().getTime();
        const final_time=end_time-Start_time;
        client.timing('delete_from_cart', final_time);
        res.redirect('/viewcart');
       });
       
      });

    }
    
});

app.post('/deleteBook',async(req,res)=>{
  const webRequestStartTime =  new Date().getTime(); 
    logger.info("Delete Book API is hit");
    const {ISBN2,sellerId2} = req.body;    
    //console.log(ISBN);
   
    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }
    
    else {

        const im = await models.sequelize.query(
            "SELECT uniqueIdentifier FROM Images where sellerId = (:id) and ISBN = (:ISBN)",
            {
              replacements: { id: req.session.id, ISBN: ISBN2 },
              type: models.sequelize.QueryTypes.SELECT,
            }
          );   
          const s3 = new aws.S3({
            Bucket: process.env.Bucketname
        });
          async function getImage(k) {
            // console.log("key " + k);
            const data = s3
              .getObject({
                Bucket: process.env.Bucketname,
                Key: k,
              })
              .promise();
            return data;
          }
    
    
          //var array1 = [];
          for (var i = 0; i < im.length; i++) {
            var m = im[i].uniqueIdentifier;
            await getImage(im[i].uniqueIdentifier)
              .then((img) => {
                // console.log(m);
                var obj = {};
                obj["key"] = m;
                var params = {  Bucket: 'webapp.viraj.rajopadhye', Key: m };
                s3.deleteObject(params, function(err, data) {
                    if (err) console.log(err, err.stack); 
                    else{
                       console.log(m+'deleted successfully');
                    }    
                  
                  });
              })
              .catch((e) => {
                  console.log(e);
                res.send(e);
              });
          }
          connection.execute('delete from SellerBooks where SellerId=? and ISBN=?',[req.session.id,ISBN2]).then(([cartbook]) => {
            connection.execute('delete from Carts where ISBN=? and sellerID=?',[ISBN2,sellerId2]).then(()=>{
                connection.execute('delete from Images where ISBN=? and sellerId=?',[ISBN2,sellerId2]).then(()=>{
                    res.redirect('/myListings');
                })
             
            });
            
           });


   

    }
        const webRequestEndTime=new Date().getTime();
        const webRequestfinalTime=webRequestEndTime-webRequestStartTime;
        client.timing('delete_book_API', webRequestfinalTime);
    
});

// Add Images

app.post('/addImages',(req,res)=>{
    const webRequestStartTime =  new Date().getTime();
    logger.info("Add Images to S3 API is hit");
    const{ISBN3}=req.body;
    console.log(ISBN3);
    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }
    else{
        connection.execute('select * from SellerBooks where SellerId=? and ISBN=?',[req.session.id,ISBN3]).then(([allbooks]) => {
            console.log(allbooks);
            console.log(allbooks[0].ISBN)
            res.render('addImages',{ISBNu:allbooks[0].ISBN});
            
        })
    }
    const webRequestEndTime=new Date().getTime();
    const webRequestfinalTime=webRequestEndTime-webRequestStartTime;
    client.timing('add_Images_API', webRequestfinalTime);

})

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },

    // By default, multer removes file extensions so let's add them back
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
   
// UPLOAD FILE
const s3 = new aws.S3({
    Bucket: process.env.Bucketname
});


app.post('/uploadimages', (req, res) => {
    logger.info("Upload Images to S3 API is hit");
    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }else{
    const Start_time=new Date().getTime();
    const isbnu2=req.query.ISBN;
    

    let upload = multer({ storage: 
                            multerS3({
                                s3:s3,
                                bucket: process.env.Bucketname,
                                acl: 'public-read',
                                key: function (req, file, cb) {
                                    
                                    cb(null, file.originalname+req.session.id); //use Date.now() for unique file keys
                                }
                             }), fileFilter: helpers.imageFilter }).array('multiple_images', 10);

                    upload(req, res, function(err) {
                        if (req.fileValidationError) {
                            return res.send(req.fileValidationError);
                        } 
                        else if (err instanceof multer.MulterError) {
                            return res.send(err);
                        }
                        else if (err) {
                            return res.send(err);
                        }
        

        
        
        
        const files = req.files;
        console.log(files);
        
            for(let i =0 ;i<files.length;i++){

                image = models.Images.create({
                fileName:files[i].originalname,
                sellerId:req.session.id,
                encoding:files[i].encoding,
                size:files[i].size,
                ISBN:isbnu2,
                uniqueIdentifier:files[i].originalname+req.session.id
            }).then(result => {
                console.log(i+" uploaded");
            }).catch(err => {
                // THROW INSERTING USER ERROR'S
                if (err) throw err;
            });

        }
        const end_time=new Date().getTime();
        const final_time=end_time-Start_time;
        client.timing('time_to_upload_images_to_s3', final_time);
        res.send(`Images have been added, Now you can <a href="/seller">view</a>`);

    });
}

});


app.get('/viewImages',async(req,res)=>{
    const webRequestStartTime =  new Date().getTime();
    logger.info("View Images API is hit");
    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }else{
    const isbn=req.query.ISBN4

    const im = await models.sequelize.query(
        "SELECT uniqueIdentifier FROM Images where sellerId = (:id) and ISBN = (:ISBN)",
        {
          replacements: { id: req.session.id, ISBN: isbn },
          type: models.sequelize.QueryTypes.SELECT,
        }
      );

      console.log(im);
   

      const s3 = new aws.S3({
        Bucket: process.env.Bucketname
    });
    async function getImage(k) {
        // console.log("key " + k);
        const data = s3
          .getObject({
            Bucket: process.env.Bucketname,
            Key: k,
          })
          .promise();
        return data;
      }


      var array1 = [];
      for (var i = 0; i < im.length; i++) {
        var m = im[i].uniqueIdentifier;
        await getImage(im[i].uniqueIdentifier)
          .then((img) => {
            // console.log(m);
            var obj = {};
            obj["key"] = m;
            obj["enc"] = encode(img.Body);
            array1.push(obj);
          })
          .catch((e) => {
              console.log(e);
            res.send(e);
          });
      }


      function encode(data) {
        let buf = Buffer.from(data);
        let base64 = buf.toString("base64");
        return base64;
      }

      return res.render("myimages", {
       
        imgarray: array1,
      });
    }
    const webRequestEndTime=new Date().getTime();
    const webRequestfinalTime=webRequestEndTime-webRequestStartTime;
    client.timing('View_Images_API', webRequestfinalTime);
})



// Delete Images
app.post('/deleteImage',(req,res)=>{
    logger.info("Delete Images API is hit");
    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');
    }else{
        const Start_time=new Date().getTime();
        const{uniqueIdentifier}=req.body;
        const ISBN4 = req.query.ISBN4
        // console.log(uniqueIdentifier)
        console.log(ISBN4)

        const s3 = new aws.S3({
            Bucket: process.env.Bucketname
        });
        // secretAccessKey: aws_config.AWS_SECRET_KEY,
            // accessKeyId: aws_config.AWS_ACCESS_KEY,
            // region: aws_config.REGION
        // aws.config.update(process.env.Bucketname);

        var params = {  Bucket: process.env.Bucketname, Key: uniqueIdentifier };

            s3.deleteObject(params, function(err, data) {
            if (err) console.log(err, err.stack); 
                        else{
                            connection.execute('delete from Images where uniqueIdentifier=? and sellerId=?',[uniqueIdentifier,req.session.id]).then(([image])=>{
                                const end_time=new Date().getTime();
                                const final_time=end_time-Start_time;
                                client.timing('time_to_delete_images_from_s3', final_time);
                                res.send('Image deleted successfully <a href="/myListings">My Listings</a>');
                            })
                        }    

                });
        }
});   

// BUYER VIEW IMAGES
app.post('/buyerImages',async(req,res)=>{
    logger.info("Buyer View Images API is hit"); 

    if(!req.session.isLoggedIn){
        console.log('session is null');
        res.redirect('/');

    }else{
    const Start_time=new Date().getTime();
    const{cartISBN,sellerId}=req.body
    const im = await models.sequelize.query(
        "SELECT uniqueIdentifier FROM Images where sellerId = (:id) and ISBN = (:ISBN)",
        {
          replacements: { id: sellerId, ISBN: cartISBN, },
          type: models.sequelize.QueryTypes.SELECT,
        }
      );
    
    const s3 = new aws.S3({
        Bucket: process.env.Bucketname
    });
    async function getImage(k) {
        // console.log("key " + k);
        const data = s3
          .getObject({
            Bucket: process.env.Bucketname,
            Key: k,
          })
          .promise();
        return data;
      }

      var array1 = [];
      for (var i = 0; i < im.length; i++) {
        var m = im[i].uniqueIdentifier;
        await getImage(im[i].uniqueIdentifier)
          .then((img) => {
            // console.log(m);
            var obj = {};
            obj["key"] = m;
            obj["enc"] = encode(img.Body);
            array1.push(obj);
          })
          .catch((e) => {
              console.log(e);
            res.send(e);
          });
      }


      function encode(data) {
        let buf = Buffer.from(data);
        let base64 = buf.toString("base64");
        return base64;
      }
      const end_time=new Date().getTime();
      const final_time=end_time-Start_time;
      client.timing('time_to_view_images_from_s3', final_time);
      
      return res.render("buyerImages", {
       
        imgarray: array1,
      });
      
    }

      
});
           

app.post('/forgetPassword',(req,res)=>{
    res.render('forgetPassword');
})

app.post('/resetPassword',[
    body('user_email').custom((value) => {
     return models.Users.findAll({where: {email:value}
                
        })
        .then(([user]) => {
            if(user!=null){
                return true;    
            }
            return Promise.reject('Invalid Email Address!');
            
        });
    }),
    
],(req,res)=>{
    const validation_result = validationResult(req);
    const {user_email} = req.body;
    //console.log(validation_result);
    if(validation_result.isEmpty()){
        var params = {
            Message: user_email, /* required */
            TopicArn: process.env.TopicARN
          };
          var publishTextPromise = new aws.SNS({apiVersion: '2010-03-31'}).publish(params).promise();
          publishTextPromise.then(
            function(data) {
              console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
              console.log("MessageID is " + data.MessageId);
              res.send('Password Reset request has been successfully sent');
            }).catch(
              function(err) {
              console.error(err, err.stack);
            });

    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
        res.render('forgetPassword',{
            login_errors:allErrors
        });
    }
    
    
})

       


// LOGOUT
app.get('/logout',(req,res)=>{
    logger.info("Logout API is hit");
    //session destroy
    req.session = null;
    
    res.redirect('/');
    
});
// END OF LOGOUT






app.use('/', (req,res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});


