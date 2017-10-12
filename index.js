require('shelljs/global');
const express = require('express');
const app = express();
var isRunning = false;

var buildBranch = function (branch) {
  isRunning = true;
  cd(__dirname + '/../api');
  exec('echo "FLUSHALL" | redis-cli');
  exec(
    "pg_dump --dbname=postgresql:/__DBURL__/ebdb --format t -f staging_dump.sql");
  exec('pg_restore --clean -d argo_api_testing staging_dump.sql');
  exec('rm -rf staging_dump.sql');
  exec('killall ruby && killall bundle');
  exec('rails s -d -p 80 &');
  exec('bundle exec sidekiq -d -l sidekiq.log &');
  isRunning = false;
};

app.get(/^\/(.*)/, function (req, res) {
  if (isRunning) {
    res.send('Already Building');
  } else {
    var branch = req.params[0];
    buildBranch(branch);
    res.send('done');
  }
  res.end();
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
