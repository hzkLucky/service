var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('商品页面');
});
router.get('/man', function(req, res, next) {
  res.render('man', {
    title: 'man'
  })
})
router.get('/woman', function(req, res, next) {
  
   res.redirect('/users/man')
});
module.exports = router;
