var createError = require('http-errors');
var cors = require('cors')
var express = require('express');
var bodyParser = require('body-parser')
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var multer = require('multer')
var upload = multer(); // for parsing multipart/form-data
var uuid = require('uuid')
var redis= require

var app = express();
app.use(cors())
app.use(bodyParser.json())
app.use( bodyParser.urlencoded({ extended: false }))


import query from './sql/config'

app.set('views', path.join(__dirname, 'views'));
app.engine('.html', require('ejs').__express);  
  app.set('view engine', 'html');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);




// 跨域请求
app.options("/*", function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.sendStatus(200);
});
app.all('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
})
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
// login接口
app.post('/gucp/user',  function(req, res, next) {
      let name = req.body.name
      query('select * from user where USER_Name = ?', [name], function(results,fields){
        //查询后的回调
        //Results代表是查询的结果，如果是插入修改等操作，则返回影响数据库信息的对象
        // fields代表查询的字段信息
        try{
          let response = null
          if( results.length === 0) {
            res.json({status: 200, data: {  pass: false}})
          }
          else if( results.length > 0 && results[0].USER_Password !== req.body.password) {
            res.json({status: 200, data: {  pass: false}})
          }
          else {
            let token = uuid()
            query('UPDATE user SET Token = ? where USER_Name = ?', [token, name])
            res.json({status: 200, data: {  pass: true, token: token, type: results[0].type}})
          }
        }catch(err) {
         console.log( err )
        }
        
      }
      )
     
    });

  // 注册接口
  app.post('/gucp/register', function( req, res) {
    let name = req.body.userName
    let pass = req.body.passWord
    let type = req.body.type
    query('SELECT * FROM user where USER_Name = ?', [name], function( result) {
     if(result && result.length > 0) {
         res.json({status: 200, data: {pass: false}})
     }
     else {
         query('INSERT INTO register (userName, passWord, type) VALUES (?, ?, ?)', [name, pass, type], function( results) {
       res.json({status: 200, data: {  pass: true }})

     })
     }
    })
   
  })
  app.get('/gucp/getUsereCount', function(req, res) {
    query('SELECT count(*) As c FROM user', [], function( results) {
      res.json({status: 200, data: {
        count: results[0].c
      }})
    })
  })
  app.post('/gucp/deleteUser', function(req, res) {
    let name = req.body.name
    query('DELETE FROM user where USER_Name = ?', [name], function( results) {
      res.json({status: 200, data: {
        success: true
      }})
    })
  })
  app.get('/gucp/admin/view', function(req, res) {
    query('SELECT * FROM user', [], function(results) {
      let data = results.map( val => {
        return {
          name: val.USER_Name,
          role: val.menus,
          private: val.type
        }
      })
      res.json({status: 200, data: data})
    })
  })
  app.get('/gucp/register/view', function(req, res) {
    query('SELECT * FROM register', [], function(results) {
      let data = results.map( val => {
        return {
          name: val.userName,
          type: val.type
        }
      })
      console.log( results )
      res.json({status: 200, data: data})
    })
  })
  app.post('/gucp/register/agree', function( req, res) {
    query('SELECT * FROM register where userName = ?', [req.body.name], function(results){
      console.log( results[0].userName)
      query('INSERT INTO user (USER_Name, USER_Password, Token, type, menus) VALUES ( ?, ?, ?, ?, ?)', [results[0].userName, results[0].passWord, 'Token', results[0].type, 'dataBase,personalSettings,changePlanning'], function(results) {
        res.json({status: 200, data: 'pass'})
      })

    })
    query('DELETE FROM register where userName = ?', [req.body.name])

  })
  app.post('/gucp/register/reject', function( req, res) {
    query('DELETE FROM register where userName = ?', [req.body.name], function() {
      res.json({status: 200, data: 'success'})
    })
  })
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});



module.exports = app;
