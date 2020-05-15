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


// redis缓存

const redis = require("redis")
const client = redis.createClient({
  port: '6379',
  host: '127.0.0.1',
  ttl:1000 * 60 * 3000
})
 
client.on("error", function(error) {
  console.error(error);
})

// 跨域请求
app.options("/*", function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.sendStatus(200);
});
app.all('*', function (req, res, next) {
  if(req.url !== '/gucp/user' && req.url !== '/gucp/register'){
    client.get("token", function( err, data){
      if( req.headers.token !== data){
        res.json({status: 304, data: { body: '没有权限' }})
      }
    }); 
  }
  
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
// 定时任务
var schedule = require('node-schedule');function scheduleCronstyle(){

  schedule.scheduleJob('30 * * * * *',function(){
  
  console.log('scheduleCronstyle:'+new Date());
  
  });
  
  }

//
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
            res.json({status: 304, data: {  pass: false}})
          }
          else {
            let token = uuid()
            client.set("token", token, redis.print);
            query('UPDATE user SET Token = ? where USER_Name = ?', [token, name])
            scheduleCronstyle();
            res.json({status: 200, data: {  pass: true, token: token, type: results[0].type}})
          }
        }catch(err) {
         console.log( err )
        }
        
      }
      )
     
    });
  // 收入接口
  app.post('/gucp/income', function( req, res){
    let value = req.body.value
    let remark = req.body.remark
    let time = req.body.time
    query('INSERT INTO income VALUES ( ?, ?, ?)', [value,  remark, time ], function( result){
      if(result){
        res.json({status: 200, code: 'success'})
      }
      else {
        res.json({status: 400, code: 'fail'})
      }
    })
  })
  app.post('/gucp/logoOut', function( req, res){
    let value = req.body.value
    
  })
  // 支出接口
  app.post('/gucp/core', function( req, res){
    let value = req.body.value
    let remark = req.body.remark
    let type = req.body.type
    let time = req.body.time
    query('INSERT INTO pen VALUES ( ?, ?, ?, ?)', [value, type, remark, time], function( result){
      if(result){
        res.json({status: 200, code: 'success'})
      }
      else {
        res.json({status: 400, code: 'fail'})
      }
    })
  })
 // 总收入接口
 app.get('/gucp/incomeSum', function( req, res){
  query('SELECT SUM(value) AS incomeSum FROM income', [], function( result){
    if(result){
      res.json({status: 200, code: 'success', body: result})
    }
    else {
      res.json({status: 400, code: 'fail', body: result})
    }
  })
})
// 支出接口
app.get('/gucp/penSum', function( req, res){
  query('SELECT SUM(value) AS penSum FROM pen', [], function( result){
    if(result){
      res.json({status: 200, code: 'success', body: result})
    }
    else {
      res.json({status: 400, code: 'fail', body: result})
    }
  })
})
// 支出接口和收入接口
app.get('/gucp/penAndIncome', function( req, res){
  query('select * from pen union all select * from income', [], ( result) => {
    if(result && result.length){

      res.json({status: 200, body: result})
     }
  })
})
  // 注册接口
  app.post('/gucp/register', function( req, res) {
    let name = req.body.userName
    let pass = req.body.passWord
    let type = req.body.type
    query('SELECT * FROM register where userName = ?', [name], function( result ){
      if( result && result.length > 0){
        res.json({
          status: 200,
          data: {
            pass: false,
            body: '注册请求已发送管理员请耐心等待'
          }
        })
      }
      else {
        query('SELECT * FROM user where USER_Name = ?', [name], function( resu) {
          if(resu && resu.length > 0) {
              res.json({status: 200, data: {pass: false, body: '该用户已经被注册'}})
          }
          else {
              query('INSERT INTO register (userName, passWord, type) VALUES (?, ?, ?)', [name, pass, type], function( resu) {
            res.json({status: 200, data: {  pass: true, body: '注册请求已发送管理员请耐心等待' }})
     
          })
          }
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
      res.json({status: 200, data: data})
    })
  })
  app.post('/gucp/register/agree', function( req, res) {
    query('SELECT * FROM register where userName = ?', [req.body.name], function(results){
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
