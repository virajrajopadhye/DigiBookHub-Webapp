require('dotenv').config();
module.exports = {

  "development": {
    "username": process.env.DBusername,
    "password": process.env.DBpassword,
    "database": process.env.DBname,
    "host": process.env.DBhost,
    "dialect": "mysql",
    "operatorsAliases": false,
    "timezone": "-04:00",
    "ssl": true
  },
  "test": {
    "username": "root",
    "password": null,
    "database": "database_test",
    "host": "127.0.0.1",
    "dialect": "mysql",
    "operatorsAliases": false
  },
  "production": {
    "username": "root",
    "password": null,
    "database": "database_production",
    "host": "127.0.0.1",
    "dialect": "mysql",
    "operatorsAliases": false
  
}
}