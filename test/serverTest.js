
const assert = require('chai').assert;
var should = require('chai').should();
var expect = require('chai').expect;
const app = require('../server');
var request = require('request');




describe ('App',function(){

    it('myData should return 123 and be a number',function(done){
        let result=app.myData();
        //console.log(app.myData);
        assert.equal(result,123);
        result.should.be.a('number');
        done();
    });




    it('Main page status ',function(done){
        request('http://localhost:3000' , function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        done();
    });

    });


    it('View page status ',function(done){
        request('http://localhost:3000/view' , function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        done();
    });
    });


    it('About page status ',function(done){
        request('http://localhost:3000/about' , function(error, response, body) {
        expect(response.statusCode).to.equal(404);
        done();
    });
    });

});