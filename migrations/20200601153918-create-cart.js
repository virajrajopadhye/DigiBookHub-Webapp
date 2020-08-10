'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Carts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ISBN: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title:{
        type: Sequelize.STRING,
        allowNull: false,
      },
      authors:{
        type: Sequelize.STRING,
        allowNull: false,
      },

      quantityBought:{
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      price:{
        type: Sequelize.DECIMAL(10,2),
        allowNull: false,
      },

      publicationDate:{
        type: Sequelize.DATE,
        allowNull: false,
      },

      buyerId:{
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      sellerId: {
        type: Sequelize.INTEGER,
        allowNull:false
      },

      totalAmt:{
        type: Sequelize.DECIMAL(10,2),
        allowNull: false,
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Carts');
  }
};