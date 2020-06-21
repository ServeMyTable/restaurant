const express = require('express')
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session'); 
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const nodemailer = require('nodemailer');
const Table = require('./models/Table');
const User = require('./models/Users');
const OrderHistory = require('./models/history');

const Multer = require('multer');
const {Storage} = require('@google-cloud/storage');
const uuid = require('uuid');
const multer = Multer({
      storage: Multer.MemoryStorage,
      limits: {
            fileSize: 5 * 1024 * 1024, 
      },
});

const app = express();
const server = http.createServer(app);
const io = socketio(server);

require('dotenv').config();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
      secret : process.env.SECRET,
      saveUninitialized : false,
      resave : false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URL,
      {
            useNewUrlParser : true , 
            useUnifiedTopology: true,
            useCreateIndex : true 
      },function(MongoError){
            if(MongoError){
                  console.log(MongoError);
            }else{
                  console.log("MongoDB database connected successfully");
            }
});

const strategy = new LocalStrategy({
      usernameField:'email',
      passwordField:'password'
},function(email, password, done) {

      User.findOne({ email: email }, (err, user) => {
            if (err) {
                  console.log(err);
            }else
            if (!user) {
                  return done(null, false,{status : 041})
      }else{

            bcrypt.compare(password,user.password,function(err,result){

                  if(!err){
                        if(result){
                              return done(null, user,{status : 2000})
                        }else{
                              return done(null, false,{status : 040})
                        }
                  }
           });
      }

      });
});

passport.use(strategy);

passport.serializeUser((user, done) => {
      
      //console.log('Serializing User : '+user.email);
      done(null, user);
      
})

passport.deserializeUser((user, done) => {
 
      //console.log('Deserializing user : '+user.email);
      done(null, user)
})

io.on('connection',function(socket){
      //console.log('New Connection with socket.io');
      const changeStream = Table.watch();
      changeStream.on("change", function(change) {

            if(change.operationType ==='insert' || change.operationType === 'update'){
                  
                  socket.emit('message',change.fullDocument);

            }
            
      });
});
  
//===========================AUTHENTICATION AND AUTHORIZATION================================

app.post('/Register',function(req,res){

      if(req.body.password === req.body.Cpassword){

            bcrypt.hash(req.body.password,10,function(error,hash){
                  if(!error){
                        newUser = new User({
                              username : req.body.username,
                              password : hash,
                              email    : req.body.email,
                        
                        });
      
                        newUser.save(function(err,result){
                              if(err){
                                    res.render("register.ejs",{Message : {msg : "Error occured Please try again!!!" , status : 0}});
                              }else{
                                    passport.authenticate('local')(req,res,function(){
                                          res.render("index.ejs",{Message : {msg : 2 , status : 2}});
                                    });
                              }
                        })
                  }
            });
      }else{
            res.render("register.ejs",{Message : {msg : "Password and Confirm Password does not Match" , status : 0}});
      }
    
});

app.post('/',function(req, res, next) {

      passport.authenticate('local', function(err, user, info) {
            if (err) { 
                  return next(err); 
            }
            if(info.status === 040){
                  return res.render('index.ejs',{Message : {msg : "Invalid Password or Username" , status : 0}})
            }
            if(info.status === 041){
                  return res.render("register.ejs",{Message : {msg : "User does not Exists!!!" , status : 0}});
            }
            req.logIn(user, function(err) {
                  if (err) { 
                        return next(err); 
                  }
                  /*
                  if(req.user.Subscribed){
                        const date = new Date(Date.now());
                        const currentDate = date.setDate(new Date(date).getDate()).toString();
                        const ExpiresDate = req.user.EndsOn;
                        if(parseInt(currentDate) > parseInt(ExpiresDate)){
                              User.updateOne({_id : req.user._id},{$set:{
                                    Subscribed : false
                              }},function(errors,raw){
                                    if(!errors){
                                          return res.render("Subscription.ejs",{user:req.user});
                                    }
                              });  
                              
                        }else{
                              */
                                    return res.redirect("/Profile");
                       /* }
                        
                  }else{
                        return res.render("Subscription.ejs",{user:req.user});;
                  }
                  */
                  
            });
      })(req, res, next);

});

app.post("/Logout",function(req,res){
      if (req.user) {
            req.logout();
            res.redirect("/");
      } else {
            console.log("Err : Not able to log out");
      }
    
});

app.post('/forgot',function(req,res){
      User.findOne({email : req.body.Email},function(err,doc){
            if(err || !doc){
                  res.render('ForgotPassword.ejs',{Message : {msg : "User Not Found Please Register",status : 0}});
            }else{
                  var transporter = nodemailer.createTransport({
    
                        service: 'gmail',
                        auth: {
                          user: process.env.EMAIL,
                          pass: process.env.PASSWORD
                        }
                  });
                  var link = 'https://restaurant.servemytable.in/change?id='+doc._id;
                  //html: '<a href='+link+'><button>Change Password</button></a>'
                  var HTML = 
                  `<!doctype html>
                  <html>
                        <head>
                        <meta charset="utf-8">
                        <style>
                              h1{
                                    font-family : 'PTSans',sans-serif
                              }
                              .yelBtn{
                                    background-color: #ffd31d;
                                    border : none;
                                    padding : 10px;
                                    font-size : medium;
                                    text-decoration : none;
                                    color : #000000;
                              }

                              .yelBtn:hover{
                        
                                    background-color: #ffd21dc2;
                              }
                              .mFont{
                                    font-family: "Noto Sans",sans-serif;
                              }
                              .line-theme{

                                    border: 1px solid #ffd31d;
                                    width: 100%;
                                    background-color: #ffd31d;
                              }
                              body{
                                    padding : 10px;
                              }
                              
                        </style>
                        <script async src="https://cdn.ampproject.org/v0.js"></script>
                        </head>
                        <body>
                              <h1>Serve My Table</h1>
                              <hr class="line-theme">
                              <p class="mFont">To Change Password click on button</p>
                              <a class="yelBtn mFont" href=${link}>Change Password</a>
                              <p class="mFont">Note : Don't Reply on this Mail.</p><br>
                              <p class="mFont"><strong>Thanks and Regards</strong> <br> Saurabh and Chaitanya <br> ServeMyTable</p>	
                        </body>
                  </html>`
                  
                  var mailOptions = {
                        from: 'servemytable@gmail.com',
                        to: doc.email,
                        subject: 'Change Password',
                        html: HTML
                        
                  };
                      
                transporter.sendMail(mailOptions, function(error, info){
                        if (error) {
                              res.render('ForgotPassword.ejs',{Message : {msg : "Sorry for Inconvenience Caused Please Try again Later",status : 0}});
                                
                        } else {
                                
                              res.render('ForgotPassword.ejs',{Message : {msg : "Check your Mail",status : 1}});
                        }
                });
        
            }
      });
});

//=================================== GET REQUESTS ====================================

app.get('/',function(req,res){

      if(req.isAuthenticated()){
            
            res.redirect("/Profile")
            
      }else{
            res.render('index.ejs',{Message : {status : 2 , msg : ""}});
      }
});

app.get('/Register',function(req,res){ res.render('register.ejs',{Message : {msg : 2 , status : 2}}); });

app.get('/forgot',function(req,res){ res.render('ForgotPassword.ejs',{Message : {msg : 2,status : 2}}); })

app.get('/Profile',function(req,res){

      if(req.isAuthenticated()){
            
            User.findById(req.user._id,function(err,doc){
                  req.logIn(doc,function(err1){

                        if(err1){ console.log("Error : "+err1) }
                        else{
                              //if(req.user.Subscribed){
                                    res.render("Profile.ejs",{user : req.user});
                              //}else{
                              //      res.render("Subscription.ejs",{user:req.user});
                              //}
                        }

                  });
            });
            
      }else{
            //console.log("User Not Found");
            res.render("index.ejs",{Message : {msg : 2 , status : 2}});
      }
});

app.get('/Dishes',function(req,res){ 
      if(req.isAuthenticated()){
            res.render("Dishes.ejs",{user : req.user});
      }else{
            //console.log("User Not Found");
            res.render("index.ejs",{Message : {msg : 2 , status : 2}});
      } 
});

app.get('/Table',function(req,res){ 

      if(req.isAuthenticated()){
            Table.find({RestaurantID : req.user.Phone},function(err,tables){
                  if(err){
            
                        console.log("Error");
                        res.render("Table.ejs",{table : [],id:"",user:req.user});
            
                  }else{
                        res.render("Table.ejs",{table : tables,id:req.user.Phone,user:req.user});
                  }
            });
      }else{
            //console.log("User Not Found");
            res.render("index.ejs",{Message : {msg : 2 , status : 2}});
      }
});

app.get('/QR',function(req,res){
      if(req.isAuthenticated()){ 
            if(req.user.nTables > 1){
                  const qrcodes = []
                  const num = req.user.nTables;
            
                  for(var i = 0 ; i <= num ; i++){
                  
                        const RestID = req.user.Phone;
                        const TableNo = (i).toString();
                        const urid = ('id='+RestID+'%26table='+TableNo).toString();
                        const data = 'https://guest.servemytable.in/restaurant?'+urid;
                        qrcodes.push('https://api.qrserver.com/v1/create-qr-code/?data='+data);
                  }
                  res.render("QR.ejs",{qrcodes:qrcodes,user:req.user}); 
            }else{
                  if(req.isAuthenticated()){
                        res.render("QR.ejs",{qrcodes:[],user:req.user});
                  }else{
                        //console.log("User Not Found");
                        res.render("index.ejs",{Message : {msg : 2 , status : 2}});
                  }
            }
      }else{
            res.render('index.ejs',{Message : {status : 2 , msg : 2}});
      }
});   

app.get('/OrderHistory',function(req,res){
      if(req.isAuthenticated()){
            OrderHistory.find({RestaurantID : req.user.Phone},function(err,doc){
                  if(err){
                        res.render('OrderHistory.ejs',{Orders : [],user:req.user});
                  }else{
                        res.render('OrderHistory.ejs',{Orders : doc,user:req.user});
                  }
            });
      }else{
            res.render('index.ejs',{Message : {status:2,msg:2}});
      }
});

app.get('/change',function(req,res){res.render('ChangePassword.ejs',{Message:req.param('id')});})

//=================================== POST REQUESTS ===================================

app.post('/QR',function(req,res){
      const qrcodes = []
      const num = req.body.qr;
      if(num != req.user.nTables){
            User.updateMany({_id : req.user._id},{$set : {nTables : num}},function(err){
                  if(err){
                        console.log(err);
                  }else{
                        res.redirect('/QR');
                  }
            })
      }else{
            res.redirect('/QR');
      }
      
});

app.post('/Account',function(req,res){
      const AccountName = req.body.AccountName;
      const AccountNumber = req.body.AccountNumber;
      const IFSCCode = req.body.IFSCcode;
      const UPIID = req.body.UPIID;

      User.updateMany({_id:req.user._id},{$set:{
            AccountName : AccountName,
            AccountNumber : AccountNumber,
            IFSCcode : IFSCCode,
            upiID : UPIID
      }},function(err,raw){
            if(err){
                  console.log("Unable to update");
            }else{
                  console.log("Updated Details Successfully");
                  res.redirect("/Profile");
            }
      });
});

app.post('/Restaurant',function(req,res){
      
      const RestaurantName = req.body.RestaurantName;
      const Location = req.body.Location;
      const NumTables = req.body.NumTables;
      const Phone = req.body.Phone;
      
      User.updateMany({_id:req.user._id},{$set:{
            RestaurantName : RestaurantName,
            Location : Location,
            nTables : NumTables,
            Phone:Phone
            }},function(err,raw){
            if(err){
                  console.log("Unable to update");
            }else{
                  console.log("Updated Details Successfully");
                  res.redirect("/Profile");
            }
      });
});

app.post('/Dish',function(req,res){
      
      const Dish = {
            DishName : req.body.DishName,
            Description : req.body.DishDes,
            Price : req.body.Price,
            tags : req.body.tags,
            Category : req.body.Category
      };

      User.updateMany({_id : req.user._id},
            {$push:{'Dishes' : Dish,'Categories' : Dish.Category}},
            function(err){
                  if(err){
                        console.log('Error');
                  }else{
                        User.findById(req.user._id,function(err,doc){
                              req.logIn(doc,function(err1){
      
                                    if(err1){ console.log("Error : "+err1) }
                                    else{
                                          res.render("Dishes.ejs",{user:req.user});
                                          //console.log('Dish Added Successfully!!!');
                                    }
      
                              });
                        });
                  }
            });
            
});

app.post('/DeleteDish',function(req,res){
      
      User.findByIdAndUpdate(req.user._id,{
            $pull : {
                  Dishes : {_id : req.body.DishID}
            }
      },
      function(error){
            if(error){
                  console.log('Error : '+error);
            }else{
                  
                  User.findById(req.user._id,function(err,doc){
                        req.logIn(doc,function(err1){

                              if(err1){ console.log("Error : "+err1) }
                              else{
                                    res.redirect("/Dishes");
                                    //console.log('Dish Removed Successfully!!!');
                              }

                        });
                  });
            }  
      });
});

app.post('/UpdateDish',function(req,res){

      const DishID = req.body.DishID;
      const Dish = {
            DishName : req.body.DishName,
            Description : req.body.DishDes,
            Price : req.body.Price,
            tags : req.body.tags,
            Category : req.body.Category
      };

      User.updateMany({_id : req.user._id},
            {$push:{'Dishes' : Dish,'Categories' : Dish.Category}},
            function(err){
                  if(err){
                        console.log('Error');
                  }else{
                        User.findById(req.user._id,function(err,doc){
                              req.logIn(doc,function(err1){
      
                                    if(err1){ console.log("Error : "+err1) }
                                    else{

                                          User.findByIdAndUpdate(req.user._id,{
                                                $pull : {
                                                      Dishes : {_id : DishID}
                                                }
                                          },
                                          function(error){
                                                if(error){
                                                      console.log('Error : '+error);
                                                }else{
                                                      
                                                      User.findById(req.user._id,function(err,doc){
                                                            req.logIn(doc,function(err1){
                                    
                                                                  if(err1){ console.log("Error : "+err1) }
                                                                  else{
                                                                        res.redirect("/Dishes");
                                                                  }
                                    
                                                            });
                                                      });
                                                }  
                                          });
                                    }
      
                              });
                        });
                  }
            });
            
});

app.post('/OrderCompleted',function(req,res){
      const tableNo = req.body.TableNo;
      const RestaurantID = req.body.RestaurantId;

      Table.findOne({RestaurantID : RestaurantID,tableNo :tableNo},function(err,doc){
            if(!err){
                  OrderHistory.insertMany(doc,function(error,addedDoc){
                        if(!error){
                              Table.findByIdAndDelete({_id : doc._id},
                                    function(e){
                                    if(!e){
                                          res.redirect('/Table');      
                                    }else{
                                          console.log(e);
                                    }
                              });
                        }else{
                              console.log("Error while inserting :"+error);
                        }
                  });
            }
            else{
                  console.log("Error while finding : "+err);
            }
      });

});

app.post('/ChangePass',function(req,res){

      bcrypt.hash(req.body.newPass,10,function(error,hash){
            if(!error){
                  User.findByIdAndUpdate(req.body.msg,{$set:{password : hash}},function(err,doc){
                        if(err || !doc){
                              res.render('index.ejs',{Message:{msg:"Failed to Change Password",status:0}})
                        }else{
                              res.render('index.ejs',{Message:{msg:"Password Changed Successfully!!",status:1}})
                        }
                  });
            }      
      });
});

const storage = new Storage({
      projectId : 'serve-my-table',
      keyFilename : './key.json'
});
const bucketName = 'restaurant-documents';
const bucket = storage.bucket(bucketName);


app.post('/UploadImage',multer.single('myFile'),
      function(req,res){

            const gcsFileName = uuid.v1()+path.extname(req.file.originalname);
            const file = bucket.file(gcsFileName);

            const stream = file.createWriteStream({
                  metadata: {
                        contentType: req.file.mimetype,
                  },
            });

            stream.on('error', (err) => {
                  req.file.cloudStorageError = err;
                  console.log("Unable to upload.");
                  console.log(err)
            });
        
            stream.on('finish', () => {
                  req.file.cloudStorageObject = gcsFileName;
            
                  return file.makePublic()
                        .then(() => {
                              
                              const Url = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
                              req.file.gcsUrl = Url;

                              if(req.user.FileName){
                                    bucket.file(req.user.FileName).delete();
                              }
                              
                              User.updateOne({_id : req.user._id},{$set : {ImageUrl : Url , FileName : gcsFileName}},
                                    function(err){
                                          if(err){
                                                console.log(err);
                                          }else{
                                                res.redirect('/Profile');
                                          }
                              });
                              
                  });
            });
        
            stream.end(req.file.buffer);

      
});

app.post('/UploadDocument',multer.any(),function(req,res){
      
      const gstNum = req.body.gst;
      const panNum = req.body.pan;

      User.updateMany(
            {_id:req.user._id},
            {$set:{pan : panNum , gstin : gstNum}},
            function(err,raw){
                  if(err){
                        console.log(err);
                  }
            });

      const panFile = uuid.v1()+path.extname(req.files[0].originalname);
      const file1 = bucket.file(panFile);
      const stream1 = file1.createWriteStream({
            metadata: {
                  contentType: req.files[0].mimetype,
            },
      });
      stream1.on('error', (err) => {
            req.files[0].cloudStorageError = err;
            console.log("Unable to upload PAN.");
            console.log(err)
      });
      stream1.on('finish', () => {
            req.files[0].cloudStorageObject = panFile;
      
            return file1.makePublic()
                  .then(() => {
                        
                        const Url = `https://storage.googleapis.com/${bucketName}/${panFile}`;
                        req.files[0].gcsUrl = Url;

                        if(req.user.panFileName){
                              bucket.file(req.user.panFileName).delete();
                        }
                        
                        User.updateOne({_id : req.user._id},{$set : {panUrl : Url , panFileName : panFile}},
                              function(err){
                                    if(err){
                                          console.log(err);
                                    }
                        });
                        
            });
      });
      stream1.end(req.files[0].buffer);

      const gstFile = uuid.v1()+path.extname(req.files[1].originalname);
      const file2 = bucket.file(gstFile);
      const stream2 = file2.createWriteStream({
            metadata: {
                  contentType: req.files[1].mimetype,
            },
      });
      stream2.on('error', (err) => {
            req.files[1].cloudStorageError = err;
            console.log("Unable to upload GST.");
            console.log(err)
      });
      stream2.on('finish', () => {
            req.files[1].cloudStorageObject = gstFile;
                                          
            return file2.makePublic()
                  .then(() => {
                        const Url = `https://storage.googleapis.com/${bucketName}/${gstFile}`;
                        req.files[1].gcsUrl = Url;            
                        if(req.user.gstFileName){
                              bucket.file(req.user.gstFileName).delete();
                        }
                                                            
                        User.updateOne({_id : req.user._id},{$set : {gstUrl : Url , gstFileName : gstFile}},
                              function(err){
                                    if(err){
                                          console.log(err);
                                          }else{
                                                res.redirect('/Profile');
                                          }
                                    });
                                                            
                        });
      });
      stream2.end(req.files[1].buffer);

});

//=================================== LISTEN ON PORT ==================================

server.listen(process.env.PORT || 3000,function(){ console.log('Server is up and Running on http://localhost:3000'); });