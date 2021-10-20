const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const request = require('sync-request');
const express = require('express');
const router = express.Router();
const Web3 = require('web3');
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
  let traits = req.query.traits;
  let useTraitNormalization = req.query.trait_normalization;
  let orderBy = req.query.order_by;
  let page = req.query.page;

  let offset = 0;
  let limit = config.page_item_num;

  if (_.isEmpty(search)) {
    search = '';
  }

  if (_.isEmpty(traits)) {
    traits = '';
  }

  let scoreTable = 'dirtypantie_scores';
  if (useTraitNormalization == '1') {
    useTraitNormalization = '1';
    scoreTable = 'normalized_dirtypantie_scores';
  } else {
    useTraitNormalization = '0';
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

  let selectedTraits = (traits != '') ? traits.split(',') : [];
  let totalDirtypantieCount = 0
  let dirtypantie = null;
  let orderByStmt = '';
  if (orderBy == 'rarity') {
    orderByStmt = 'ORDER BY '+scoreTable+'.rarity_rank ASC';
  } else {
    orderByStmt = 'ORDER BY dirtypantie.id ASC';
  }

  let totalSupply = db.prepare('SELECT COUNT(dirtypantie.id) as dirtypantie_total FROM dirtypantie').get().dirtypantie_total;
  let allTraitTypes = db.prepare('SELECT trait_types.* FROM trait_types').all();
  let allTraitTypesData = {};
  allTraitTypes.forEach(traitType => {
    allTraitTypesData[traitType.trait_type] = traitType.dirtypantie_count;
  });

  let allTraits = db.prepare('SELECT trait_types.trait_type, trait_detail_types.trait_detail_type, trait_detail_types.dirtypantie_count, trait_detail_types.trait_type_id, trait_detail_types.id trait_detail_type_id  FROM trait_detail_types INNER JOIN trait_types ON (trait_detail_types.trait_type_id = trait_types.id) WHERE trait_detail_types.dirtypantie_count != 0 ORDER BY trait_types.trait_type, trait_detail_types.trait_detail_type').all();
  let totalDirtypantieCountQuery = 'SELECT COUNT(dirtypantie.id) as dirtypantie_total FROM dirtypantie INNER JOIN '+scoreTable+' ON (dirtypantie.id = '+scoreTable+'.dirtypantie_id) ';
  let dirtypantieQuery = 'SELECT dirtypantie.*, '+scoreTable+'.rarity_rank FROM dirtypantie INNER JOIN '+scoreTable+' ON (dirtypantie.id = '+scoreTable+'.dirtypantie_id) ';
  let totalDirtypantieCountQueryValue = {};
  let dirtypantieQueryValue = {};

  if (!_.isEmpty(search)) {
    search = parseInt(search);
    totalDirtypantieCountQuery = totalDirtypantieCountQuery+' WHERE dirtypantie.id LIKE :dirtypantie_id ';
    totalDirtypantieCountQueryValue['dirtypantie_id'] = '%'+search+'%';

    dirtypantieQuery = dirtypantieQuery+' WHERE dirtypantie.id LIKE :dirtypantie_id ';
    dirtypantieQueryValue['dirtypantie_id'] = '%'+search+'%';
  } else {
    totalDirtypantieCount = totalDirtypantieCount;
  }

  let allTraitTypeIds = [];
  allTraits.forEach(trait => {
    if (!allTraitTypeIds.includes(trait.trait_type_id.toString())) {
      allTraitTypeIds.push(trait.trait_type_id.toString());
    }
  }); 

  let purifySelectedTraits = [];
  if (selectedTraits.length > 0) {

    selectedTraits.map(selectedTrait => {
      selectedTrait = selectedTrait.split('_');
      if ( allTraitTypeIds.includes(selectedTrait[0]) ) {
        purifySelectedTraits.push(selectedTrait[0]+'_'+selectedTrait[1]);
      }
    });

    if (purifySelectedTraits.length > 0) {
      if (!_.isEmpty(search.toString())) {
        totalDirtypantieCountQuery = totalDirtypantieCountQuery + ' AND ';
        dirtypantieQuery = dirtypantieQuery + ' AND ';
      } else {
        totalDirtypantieCountQuery = totalDirtypantieCountQuery + ' WHERE ';
        dirtypantieQuery = dirtypantieQuery + ' WHERE ';
      }
      let count = 0;

      purifySelectedTraits.forEach(selectedTrait => {
        selectedTrait = selectedTrait.split('_');
        totalDirtypantieCountQuery = totalDirtypantieCountQuery+' '+scoreTable+'.trait_type_'+selectedTrait[0]+'_value = :trait_type_'+selectedTrait[0]+'_value ';
        dirtypantieQuery = dirtypantieQuery+' '+scoreTable+'.trait_type_'+selectedTrait[0]+'_value = :trait_type_'+selectedTrait[0]+'_value ';
        if (count != (purifySelectedTraits.length-1)) {
          totalDirtypantieCountQuery = totalDirtypantieCountQuery + ' AND ';
          dirtypantieQuery = dirtypantieQuery + ' AND ';
        }
        count++;

        totalDirtypantieCountQueryValue['trait_type_'+selectedTrait[0]+'_value'] = selectedTrait[1];
        dirtypantieQueryValue['trait_type_'+selectedTrait[0]+'_value'] = selectedTrait[1];    
      });
    }
  }
  let purifyTraits = purifySelectedTraits.join(',');

  dirtypantieQuery = dirtypantieQuery+' '+orderByStmt+' LIMIT :offset,:limit';
  dirtypantieQueryValue['offset'] = offset;
  dirtypantieQueryValue['limit'] = limit;

  totalDirtypantieCount = db.prepare(totalDirtypantieCountQuery).get(totalDirtypantieCountQueryValue).dirtypantie_total;
  dirtypantie = db.prepare(dirtypantieQuery).all(dirtypantieQueryValue);

  let totalPage =  Math.ceil(totalDirtypantieCount/limit);

  res.render('index', { 
    appTitle: config.app_name,
    appDescription: config.app_description,
    ogTitle: config.collection_name + ' | ' + config.app_name,
    ogDescription: config.collection_description + ' | ' + config.app_description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: config.main_og_image,
    activeTab: 'rarity',
    dirtypantie: dirtypantie, 
    totalDirtypantieCount: totalDirtypantieCount,
    totalPage: totalPage, 
    search: search, 
    useTraitNormalization: useTraitNormalization,
    orderBy: orderBy,
    traits: purifyTraits,
    selectedTraits: purifySelectedTraits,
    allTraits: allTraits,
    page: page,
    totalSupply: totalSupply,
    allTraitTypesData: allTraitTypesData,
    _:_ 
  });
});

router.get('/matrix', function(req, res, next) {

  let allTraits = db.prepare('SELECT trait_types.trait_type, trait_detail_types.trait_detail_type, trait_detail_types.dirtypantie_count FROM trait_detail_types INNER JOIN trait_types ON (trait_detail_types.trait_type_id = trait_types.id) WHERE trait_detail_types.dirtypantie_count != 0 ORDER BY trait_types.trait_type, trait_detail_types.trait_detail_type').all();
  let allTraitCounts = db.prepare('SELECT * FROM dirtypantie_trait_counts WHERE dirtypantie_count != 0 ORDER BY trait_count').all();
  let totalDirtypantieCount = db.prepare('SELECT COUNT(id) as dirtypantie_total FROM dirtypantie').get().dirtypantie_total;

  res.render('matrix', {
    appTitle: config.app_name,
    appDescription: config.app_description,
    ogTitle: config.collection_name + ' | ' + config.app_name,
    ogDescription: config.collection_description + ' | ' + config.app_description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: config.main_og_image,
    activeTab: 'matrix',
    allTraits: allTraits,
    allTraitCounts: allTraitCounts,
    totalDirtypantieCount: totalDirtypantieCount,
    _:_ 
  });
});

router.get('/wallet', function(req, res, next) {
  let search = req.query.search;
  let useTraitNormalization = req.query.trait_normalization;

  if (_.isEmpty(search)) {
    search = '';
  }

  let scoreTable = 'dirtypantie_scores';
  if (useTraitNormalization == '1') {
    useTraitNormalization = '1';
    scoreTable = 'normalized_dirtypantie_scores';
  } else {
    useTraitNormalization = '0';
  }

  let isAddress = Web3.utils.isAddress(search);
  let tokenIds = [];
  let dirtypantie = null;
  if (isAddress) {
    let url = 'https://api.dirtypantiecape.xyz/address/'+search+'/dirtypantiecapes';
    let result = request('GET', url);
    let data = result.getBody('utf8');
    data = JSON.parse(data);
    data.forEach(element => {
      tokenIds.push(element.token_id);
    });
    if (tokenIds.length > 0) {
      let dirtypantieQuery = 'SELECT dirtypantie.*, '+scoreTable+'.rarity_rank FROM dirtypantie INNER JOIN '+scoreTable+' ON (dirtypantie.id = '+scoreTable+'.dirtypantie_id) WHERE dirtypantie.id IN ('+tokenIds.join(',')+') ORDER BY '+scoreTable+'.rarity_rank ASC';
      dirtypantie = db.prepare(dirtypantieQuery).all();
    }
  }

  res.render('wallet', {
    appTitle: config.app_name,
    appDescription: config.app_description,
    ogTitle: config.collection_name + ' | ' + config.app_name,
    ogDescription: config.collection_description + ' | ' + config.app_description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: config.main_og_image,
    activeTab: 'wallet',
    dirtypantie: dirtypantie,
    search: search, 
    useTraitNormalization: useTraitNormalization,
    _:_ 
  });
});

module.exports = router;
