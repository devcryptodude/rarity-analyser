const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const Database = require('better-sqlite3');
const _ = require('lodash');

let databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (!fs.existsSync(databasePath)) {
  databasePath = appRoot + '/config/database.sqlite.sample';
}

const db = new Database(databasePath);

/* GET home page. */
router.get('/', function(req, res, next) {

  let search = req.query.search;
  let orderBy = req.query.order_by;
  let page = req.query.page;

  let offset = 0;
  let limit = 100;

  if (_.isEmpty(search)) {
    search = '';
  }

  if (orderBy == 'rarity' || orderBy == 'id') {
    orderBy = orderBy;
  } else {
    orderBy = 'rarity';
  }

  if (!_.isEmpty(page)) {
    page = parseInt(page);
    if (!isNaN(page)) {
      offset = (Math.abs(page) - 1) * limit;
    } else {
      page = 1;
    }
  } else {
    page = 1;
  }

  let totalPunkCount = 0
  let punks = null;
  let orderByStmt = '';
  if (orderBy == 'rarity') {
    orderByStmt = 'ORDER BY punk_scores.rarity_rank ASC';
  } else {
    orderByStmt = 'ORDER BY punks.id ASC';
  }

  if (!_.isEmpty(search)) {
    totalPunkCount = db.prepare('SELECT COUNT(id) as punk_total FROM punks WHERE punks.id LIKE ?').get('%'+search+'%').punk_total;
    punks =  db.prepare('SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) WHERE punks.id LIKE ? '+orderByStmt+' LIMIT ?,?').all('%'+search+'%', offset, limit);
  } else {
    totalPunkCount = db.prepare('SELECT COUNT(id) as punk_total FROM punks').get().punk_total;
    punks = db.prepare('SELECT punks.*, punk_scores.rarity_rank FROM punks INNER JOIN punk_scores ON (punks.id = punk_scores.punk_id) '+orderByStmt+' LIMIT ?,?').all(offset, limit);
  }

  let totalPage =  Math.ceil(totalPunkCount/limit);

  res.render('index', { 
    title: config.app_name,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: config.main_og_image,
    activeTab: 'rarity',
    punks: punks, 
    totalPage: totalPage, 
    search: search, 
    orderBy, orderBy, 
    page: page,
    _:_ 
  });
});

router.get('/matrix', function(req, res, next) {

  let allTraits = db.prepare('SELECT trait_types.trait_type, trait_detail_types.trait_detail_type, trait_detail_types.punk_count FROM trait_detail_types INNER JOIN trait_types ON (trait_detail_types.trait_type_id = trait_types.id) ORDER BY trait_detail_types.trait_type_id, trait_detail_types.id').all();
  let allTraitCounts = db.prepare('SELECT * FROM punk_trait_counts ORDER BY trait_count').all();
  let totalPunkCount = db.prepare('SELECT COUNT(id) as punk_total FROM punks').get().punk_total;

  res.render('matrix', {
    title: config.app_name,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: config.main_og_image,
    activeTab: 'matrix',
    allTraits: allTraits,
    allTraitCounts: allTraitCounts,
    totalPunkCount: totalPunkCount,
    _:_ 
  });
});

module.exports = router;
