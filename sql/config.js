var mysql = require('mysql');

// 创建 mysql 连接池资源
var pool = mysql.createPool({
  host     : 'localhost',       //主机
  user     : 'root',               //MySQL认证用户名
  password : 'jpGO-5708',        //MySQL认证用户密码
  port: '3306',                   //端口号
  database: 'gucp'
});

 function query(sql, arr, callback){
  //建立链接
  pool.getConnection(function(err,connection){
      if(err){throw err;return;}
      connection.query(sql,arr,function(error,results,fields){
          //将链接返回到连接池中，准备由其他人重复使用
          connection.release();
          if(error) throw error;
          //执行回调函数，将数据返回
          callback && callback(results,fields);
      });
  });
};

export default query