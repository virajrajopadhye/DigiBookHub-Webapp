'use strict';
module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define('Cart', {
    ISBN: DataTypes.STRING,
    title: DataTypes.STRING,
    authors: DataTypes.STRING,
    quantityBought: DataTypes.INTEGER,
    price: DataTypes.DECIMAL(10,2),
    publicationDate: DataTypes.DATE,
    buyerId: DataTypes.INTEGER,
    sellerId: DataTypes.INTEGER,
    totalAmt: DataTypes.DECIMAL(10,2)
    
   
  }, {});
  Cart.associate = function(models) {
    // associations can be defined here
  };
  return Cart;
};