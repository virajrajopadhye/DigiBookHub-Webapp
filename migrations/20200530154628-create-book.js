'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Books', {
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
    return queryInterface.dropTable('Books');
  }
};