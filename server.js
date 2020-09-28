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

const ifsc = require('ifsc');
const MyRequest = require('request');

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
                  throw MongoError;
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
                  return done("Some Error Occured.",false);
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
                  }else{
                        return done("Some Error Occured.",false);
                  }
           });
      }

      });
});

passport.use(strategy);

passport.serializeUser((user, done) => {

      done(null, user);

})

passport.deserializeUser((user, done) => {

      done(null, user)
})

io.on('connection',function(socket){
      const changeStream = Table.watch();
      changeStream.on("change", function(change) {

            if(change.operationType ==='insert' || change.operationType === 'update'){

                  socket.emit('message',change.fullDocument);

            }

      });
});
const storage = new Storage({
      projectId : 'serve-my-table',
      keyFilename : './key.json'
});
const bucketName = 'restaurant-documents';
const bucket = storage.bucket(bucketName);

//=============================================================================================================
//Register
app.get('/Register',function(req,res){ res.render('register.ejs',{Message : {msg : 2 , status : 2}}); });
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
                  }else{
                        res.render('Error.ejs',{error : "Error in securing password"});
                  }
            });
      }else{
            res.render("register.ejs",{Message : {msg : "Password and Confirm Password does not Match" , status : 0}});
      }

});

//Login
app.get('/',function(req,res){

      if(req.isAuthenticated()){

            res.redirect("/Profile")

      }else{
            res.render('index.ejs',{Message : {status : 2 , msg : ""}});
      }
});

app.post('/',function(req, res, next) {

      passport.authenticate('local', function(err, user, info) {
            if (err) {
                  return res.render('Error.ejs',{error : err});
            }
            if(info.status === 040){
                  return res.render('index.ejs',{Message : {msg : "Invalid Password or Username" , status : 0}})
            }
            if(info.status === 041){
                  return res.render("register.ejs",{Message : {msg : "User does not Exists!!!" , status : 0}});
            }
            req.logIn(user, function(err) {
                  if (err) {
                        return res.render('Error.ejs',{error : "Some Error Occured."});
                  }

                  return res.redirect("/Profile");

            });
      })(req, res, next);

});

//Forgot Password
app.get('/forgot',function(req,res){ res.render('ForgotPassword.ejs',{Message : {msg : 2,status : 2}}); })

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

//Change Password
app.get('/change',function(req,res){res.render('ChangePassword.ejs',{Message:req.param('id')});})
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

//Logout
app.post("/Logout",function(req,res){
      if (req.user) {
            req.logout();
            res.redirect("/");
      } else {
            res.render('Error.ejs',{error : "Error in logging out or You have already logged Out."});
      }

});

//=============================================================================================================
//Profile
app.get('/Profile',function(req,res){

      if(req.isAuthenticated()){

            User.findById(req.user._id,function(err,doc){
                  req.logIn(doc,function(err1){

                        if(err1){ res.render('Error.ejs',{error : "Error in Logging in"});}
                        else{
                              res.render("Profile.ejs",{user : req.user});
                        }

                  });
            });

      }else{
            res.render("index.ejs",{Message : {msg : 2 , status : 2}});
      }
});

app.post('/Account',function(req,res){
      const AccountName = req.body.AccountName;
      const AccountNumber = req.body.AccountNumber;
      const IFSCCode = req.body.IFSCcode;
      const AccountType = req.body.AccountType;

      const Email = req.body.Email;
      const RestaurantName = req.body.RestaurantName;
      const BussinessType = req.body.BussinessType;


      if(ifsc.validate(IFSCCode)){

        ifsc.fetchDetails(IFSCCode).then(function(result){

          const OtherBankDetails = JSON.stringify(result);
          const keyid = process.env.KEYID;
          const sec = process.env.KEYSECRET;

          var data = {
            "name":AccountName,
            "email":Email,
            "tnc_accepted" : true,
            "account_details":{
                "business_name":RestaurantName,
                "business_type":BussinessType,
            },
            "bank_account":{
                "ifsc_code":IFSCCode,
                "beneficiary_name":AccountName,
                "account_type":AccountType,
                "account_number":AccountNumber,
            }
          };

          var options = {
            method : "POST",
            url : "https://api.razorpay.com/v1/beta/accounts",
            headers : {
              "Authorization" : "Basic "+new Buffer.from(keyid+":"+sec).toString("base64"),
              "Content-type": "application/json"
            },
            body : JSON.stringify(data),
            };

          MyRequest(options,function(error,response){
            if(error){ console.log(error);
            throw new Error(error); }else{

              const resp = JSON.parse(response.body);

              User.updateMany({_id:req.user._id},{
                $set:{
                  AccountName : AccountName,
                  AccountNumber : AccountNumber,
                  RazAccountId : resp.id,
                  IFSCcode : IFSCCode,
                  AccountType : AccountType,
                  OtherBankDetails : OtherBankDetails
               }},function(err,raw){
                     if(err){
                       res.render('Error.ejs',{error : "Error in updating Account Details"});
                     }else{
                        res.redirect("/Profile");
                    }
              });
            }
        });

      });

      }else{
        res.render('Error.ejs',{error : "Invalid IFSC code."});
      }
});

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
                  res.render('Error.ejs',{error : "Unable to Upload Document"});
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
                                                res.render('Error.ejs',{error : "Error in Uploading"});
                                          }else{
                                                res.redirect('/Profile');
                                          }
                              });

                  });
            });

            stream.end(req.file.buffer);


});

app.post('/UploadDocument',function(req,res){

      const gstNum = req.body.gst;
      const panNum = req.body.pan;

      User.updateMany(
            { _id : req.user._id },
            {$set:{pan : panNum , gstin : gstNum}},
            function(err,raw){
                  if(err){
                        res.render('Error.ejs',{error : "Error in Uploading."});
                  }else{
                        res.redirect("/Profile");
                  }
            });
});

app.post('/Restaurant',function(req,res){


      const RestaurantName = req.body.RestaurantName;
      const Location = req.body.Location;
      const NumTables = req.body.NumTables;
      const BussinessType = req.body.bType;

      User.updateMany({_id:req.user._id},{$set:{
            RestaurantName : RestaurantName,
            Location : Location,
            nTables : NumTables,
            BussinessType:BussinessType
            }},function(err,raw){
            if(err){
                  res.render('Error.ejs',{error : "Error in Updating Restaurant Details"});
            }else{
                  res.redirect("/Profile");
            }
      });
});

//=============================================================================================================
//Table Management
app.get('/Table',function(req,res){

      if(req.isAuthenticated()){
            Table.find({RestaurantID : req.user.Phone},function(err,tables){
                  if(err){

                        res.render("Table.ejs",{table : [],id:"",user:req.user});

                  }else{
                        res.render("Table.ejs",{table : tables,id:req.user.Phone,user:req.user});
                  }
            });
      }else{
            res.render("index.ejs",{Message : {msg : 2 , status : 2}});
      }
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
                                          res.render('Error.ejs',{error : "Server Error"});
                                    }
                              });
                        }else{
                              res.render('Error.ejs',{error : "Error in Updating Details"});
                        }
                  });
            }
            else{
                  res.render('Error.ejs',{error : "User Not Found"});
            }
      });

});

//=============================================================================================================
//Dish
app.get('/Dishes',function(req,res){
      if(req.isAuthenticated()){
            res.render("Dishes.ejs",{user : req.user});
      }else{
            res.render("index.ejs",{Message : {msg : 2 , status : 2}});
      }
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
                        res.render('Error.ejs',{error : "Error in Updating Dish"});
                  }else{
                        User.findById(req.user._id,function(err,doc){
                              req.logIn(doc,function(err1){

                                    if(err1){ res.render('Error.ejs',{error : "Some Error Occured."}); }
                                    else{
                                          res.render("Dishes.ejs",{user:req.user});
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
                  res.render('Error.ejs',{error : "Error in Deleting Dish"});
            }else{

                  User.findById(req.user._id,function(err,doc){
                        req.logIn(doc,function(err1){

                              if(err1){ res.render('Error.ejs',{error : "Some Error Occured."}); }
                              else{
                                    res.redirect("/Dishes");
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
                        res.render('Error.ejs',{error : "Error in Updating Dish"});
                  }else{
                        User.findById(req.user._id,function(err,doc){
                              req.logIn(doc,function(err1){

                                    if(err1){ res.render('Error.ejs',{error : "Some Error in Occured."}); }
                                    else{

                                          User.findByIdAndUpdate(req.user._id,{
                                                $pull : {
                                                      Dishes : {_id : DishID}
                                                }
                                          },
                                          function(error){
                                                if(error){
                                                      res.render('Error.ejs',{error : "Error in Updating Details"});
                                                }else{

                                                      User.findById(req.user._id,function(err,doc){
                                                            req.logIn(doc,function(err1){

                                                                  if(err1){ res.render('Error.ejs',{error : "Some Error Occured."}); }
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

//=============================================================================================================
//QR codes
app.get('/QR',function(req,res){
      if(req.isAuthenticated()){
            
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
            res.render('index.ejs',{Message : {status : 2 , msg : 2}});
      }
});

app.post('/QR',function(req,res){
      
      const num = req.body.qr;
      if(num != req.user.nTables){
            User.updateMany({_id : req.user._id},{$set : {nTables : num}},function(err){
                  if(err){
                        res.render('Error.ejs',{error : "Error in Updating Number of Tables"});
                    }else{
                        const qrcodes = []
                        for(var i = 0 ; i <= num ; i++){
                            const RestID = req.user.Phone;
                            const TableNo = (i).toString();
                            const urid = ('id='+RestID+'%26table='+TableNo).toString();
                            const data = 'https://guest.servemytable.in/restaurant?'+urid;
                            qrcodes.push('https://api.qrserver.com/v1/create-qr-code/?data='+data);
                        }
                        res.render("QR.ejs",{qrcodes:qrcodes,user:req.user});
                    }
            })
        }else{
            res.redirect('/QR');
        }

});


//=============================================================================================================
//Order History
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

//=============================================================================================================
//Place Order
app.get('/PlaceOrder',function(req,res){

      if(req.isAuthenticated()){
            res.render('PlaceOrder.ejs',{
                  Restaurant : {
                        dishes : req.user.Dishes,
                        full : req.user
                  },
                  user:req.user
            });
      }else{
            res.render('index.ejs',{Message : {status:2,msg:2}});
      }
});

app.post('/PlaceOrder',function(req,res){

      const Orders = [];
      const result = req.body.Dish;

      for(var i = 0 ; i < result.length ; i++){
            Orders.push({
                  DishName : result[i].Dish,
                  Quantity :result[i].Quantity,
                  Rate : result[i].Price
            });
      }

      Table.insert(
            {
                  RestaurantID : req.user.Phone,
                  tableNo : req.body.TableNo,
                  Orders : Orders,
                  TotalBill : req.body.TotalBill,
                  SubTotal : req.body.SubTotal,
                  CustomerName : req.body.CustomerName,
                  PaymentMode : "Placed",
                  PaymentStatus : true
            },function(error,raw){
            
            if(!error){
                  res.send("Done");
            }else{
                  res.render('Error.ejs',{error : "Some Error Occured."});
            }
      });

});

//=============================================================================================================

app.get('*',function(req,res){
      res.render('404.ejs');
});

server.listen(process.env.PORT || 5000,function(){ console.log('Server is up and Running on http://localhost:5000'); });
