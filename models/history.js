const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Today = new Date(Date.now()).toLocaleString().split(',');

const date = Today[0].toString();
const Time = Today[1].toString();

const OrderSchema = new Schema({

      DishName : {
            type : String,
            default : ""
      },
      Quantity : {
            type : Number,
            default : 0
      },
      Rate : {
            type : Number,
            default : 0
      }
});

const tableSchema = new Schema({

      RestaurantID : {
            type :String
      },
      tableNo : {
            type : Number,
            default : 0
      },
      Orders : [OrderSchema],
      TotalBill : {
            type : String
      },
      SubTotal : {
            type : String
      },
      CompletedDateOrder : {
              type : String,
              default : date
      },
      CompletedTimeOrder : {
              type : String,
              default : Time 
      },
      OrderPlacedTime : {
            type : String
      },
      OrderPlacedDate : {
            type : String
      },
      CustomerName : {
            type : String
      },
      PaymentMode : { type : String },
      PaymentStatus : {type : Boolean, default:false},
      PaymentID : {type: String , default : ""}
},{
        timestamps:true
});

const Table = mongoose.model('history',tableSchema);

module.exports = Table;