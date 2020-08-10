'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('SellerBooks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ISBN: {
        type: Sequelize.STRING
      },

      title: {
        type: Sequelize.STRING
      },

      authors: {
        type: Sequelize.STRING,
        allowNull: false,
        get() {
            return this.getDataValue('authors').split(';')
        },
        set(val) {
           this.setDataValue('authors',val.join(';'));
        },
      }, 

      publicationDate: {
        type: Sequelize.DATE,
        allowNull:false,

      },

      quantity: {
        type: Sequelize.INTEGER,
        allowNull:false
      },

      price:{
        type: Sequelize.DECIMAL(10,2),
        allowNull:false
      },
 
      sellerId: {
        type: Sequelize.INTEGER,
        allowNull:false
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
    return queryInterface.dropTable('SellerBooks');
  }
};