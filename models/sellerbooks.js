'use strict';
module.exports = (sequelize, DataTypes) => {
  const SellerBooks = sequelize.define('SellerBooks', {
    ISBN: DataTypes.STRING,
    title: DataTypes.STRING,
    authors: DataTypes.STRING,
    publicationDate: DataTypes.DATE,
    quantity: DataTypes.INTEGER,
    price: DataTypes.DECIMAL(10,2),
    sellerId: DataTypes.INTEGER
  }, {});
  SellerBooks.associate = function(models) {
    // associations can be defined here
  };
  return SellerBooks;
};