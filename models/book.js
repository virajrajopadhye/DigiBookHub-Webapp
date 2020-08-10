'use strict';
module.exports = (sequelize, DataTypes) => {
  const Book = sequelize.define('Book', {
    ISBN: DataTypes.STRING,
    title: DataTypes.STRING,
    authors: DataTypes.STRING,
    publicationDate: DataTypes.DATE,
    
  }, {
 
  
  });
  Book.associate = function(models) {
    // associations can be defined here
  };
  return Book;
};  