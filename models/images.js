'use strict';
module.exports = (sequelize, DataTypes) => {
  const Images = sequelize.define('Images', {
    fileName: DataTypes.STRING,
    sellerId: DataTypes.INTEGER,
    encoding: DataTypes.STRING,
    size: DataTypes.INTEGER,
    ISBN: DataTypes.STRING,
    uniqueIdentifier: DataTypes.STRING

  }, {});
  Images.associate = function(models) {
    // associations can be defined here
  };
  return Images;
};