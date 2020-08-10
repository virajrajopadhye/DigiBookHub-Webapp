var mysql = require('mysql2');


var connection = mysql.createPool({
    host     : process.env.DBhost,
    user     : process.env.DBusername,
    password : process.env.DBpassword,
    database : process.env.DBname
  }).promise();


module.exports=connection;