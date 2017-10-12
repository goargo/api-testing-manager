require('shelljs/global');
const Promise = require('bluebird');
const express = require('express');
const app = express();
var isRunning = false;
var activeBranch;

cd(__dirname + '/../api');

// Sync
var buildBranch = function (branch) {
  if (isRunning) {
    return false;
  }
  isRunning = true;
  exec('echo "FLUSHALL" | redis-cli');
  exec(
    "pg_dump --dbname=postgresql://argoapi:__DBURL__:5432/ebdb --format t -f staging_dump.sql"
  );
  exec('pg_restore --clean -d argo_api_testing staging_dump.sql');
  exec('rm -rf staging_dump.sql');
  exec('sudo killall ruby && sudo killall bundle');
  exec('bundle install');
  exec('rake db:migrate');
  exec('rbenv sudo rails s -d -p 80 &');
  exec('bundle exec sidekiq -d -l sidekiq.log &');
  isRunning = false;
  activeBranch = branch;
};

app.get('/checkout', function (req, res) {
  if (isRunning) {
    res.send('Already Building');
  } else {
    var branch = req.query.branch;
    exec('git fetch origin');
    if (exec('git checkout origin/' + branch)
      .code !== 0)
      return res.send('branch ' + branch + ' doesnt exist');
    res.send('Building branch ' + branch +
      '. Please be patient, it can take up to a minute to deploy the branch. It will be active at http://testing.api.goargo.com'
    );
    res.end();
    buildBranch(branch);
  }
});

app.get('/status', function (req, res) {
  res.send(activeBranch);
});

app.listen(3000, function () {
  console.log('listening on port 3000!')
})
