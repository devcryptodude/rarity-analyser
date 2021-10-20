const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const Database = require('better-sqlite3');
const jsondata = require(appRoot + '/modules/jsondata.js');
const _ = require('lodash');
const MarkdownIt = require('markdown-it'),
    md = new MarkdownIt();

let databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (!fs.existsSync(databasePath)) {
  databasePath = appRoot + '/config/database.sqlite.sample';
}

const db = new Database(databasePath);

/* GET dirtypantie listing. */
router.get('/:id', function(req, res, next) {
  let dirtypantieId = req.params.id;
  let useTraitNormalization = req.query.trait_normalization;

  let scoreTable = 'dirtypantie_scores';
  if (useTraitNormalization == '1') {
    useTraitNormalization = '1';
    scoreTable = 'normalized_dirtypantie_scores';
  } else {
    useTraitNormalization = '0';
  }

  let dirtypantie = db.prepare('SELECT dirtypantie.*, '+scoreTable+'.rarity_rank FROM dirtypantie INNER JOIN '+scoreTable+' ON (dirtypantie.id = '+scoreTable+'.dirtypantie_id) WHERE dirtypantie.id = ?').get(dirtypantieId);
  let dirtypantieScore = db.prepare('SELECT '+scoreTable+'.* FROM '+scoreTable+' WHERE '+scoreTable+'.dirtypantie_id = ?').get(dirtypantieId);
  let allTraitTypes = db.prepare('SELECT trait_types.* FROM trait_types').all();
  let allDetailTraitTypes = db.prepare('SELECT trait_detail_types.* FROM trait_detail_types').all();
  let allTraitCountTypes = db.prepare('SELECT dirtypantie_trait_counts.* FROM dirtypantie_trait_counts').all();

  let dirtypantieTraits = db.prepare('SELECT dirtypantie_traits.*, trait_types.trait_type  FROM dirtypantie_traits INNER JOIN trait_types ON (dirtypantie_traits.trait_type_id = trait_types.id) WHERE dirtypantie_traits.dirtypantie_id = ?').all(dirtypantieId);
  let totalDirtypantieCount = db.prepare('SELECT COUNT(id) as dirtypantie_total FROM dirtypantie').get().dirtypantie_total;

  let dirtypantieTraitData = {};
  let ignoredDirtypantieTraitData = {};
  let ignoreTraits = config.ignore_traits.map(ignore_trait => ignore_trait.toLowerCase());
  dirtypantieTraits.forEach(dirtypantieTrait => {
    dirtypantieTraitData[dirtypantieTrait.trait_type_id] = dirtypantieTrait.value;

    if (!ignoreTraits.includes(dirtypantieTrait.trait_type.toLowerCase())) {
      ignoredDirtypantieTraitData[dirtypantieTrait.trait_type_id] = dirtypantieTrait.value;
    }
  });

  let allDetailTraitTypesData = {};
  allDetailTraitTypes.forEach(detailTrait => {
    allDetailTraitTypesData[detailTrait.trait_type_id+'|||'+detailTrait.trait_detail_type] = detailTrait.dirtypantie_count;
  });

  let allTraitCountTypesData = {};
  allTraitCountTypes.forEach(traitCount => {
    allTraitCountTypesData[traitCount.trait_count] = traitCount.dirtypantie_count;
  });

  let title = config.collection_name + ' | ' + config.app_name;
  //let description = config.collection_description + ' | ' + config.app_description
  let description = dirtypantie ? `💎 ID: ${ dirtypantie.id }
    💎 Rarity Rank: ${ dirtypantie.rarity_rank }
    💎 Rarity Score: ${ dirtypantieScore.rarity_sum.toFixed(2) }` : '';

  if (!_.isEmpty(dirtypantie)) {
    title = dirtypantie.name + ' | ' + config.app_name;
  }
  
  res.render('dirtypantie', { 
    appTitle: title,
    appDescription: description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: dirtypantie,
    activeTab: 'rarity',
    dirtypantie: dirtypantie, 
    dirtypantieScore: dirtypantieScore, 
    allTraitTypes: allTraitTypes, 
    allDetailTraitTypesData: allDetailTraitTypesData, 
    allTraitCountTypesData: allTraitCountTypesData, 
    dirtypantieTraitData: dirtypantieTraitData, 
    ignoredDirtypantieTraitData: ignoredDirtypantieTraitData,
    totalDirtypantieCount: totalDirtypantieCount, 
    trait_normalization: useTraitNormalization,
    _: _,
    md: md
  });
});

router.get('/:id/json', function(req, res, next) {
  let dirtypantieId = req.params.id;
  let useTraitNormalization = req.query.trait_normalization;

  let scoreTable = 'dirtypantie_scores';
  if (useTraitNormalization == '1') {
    useTraitNormalization = '1';
    scoreTable = 'normalized_dirtypantie_scores';
  } else {
    useTraitNormalization = '0';
  }

  let dirtypantie = db.prepare('SELECT dirtypantie.*, '+scoreTable+'.rarity_rank FROM dirtypantie INNER JOIN '+scoreTable+' ON (dirtypantie.id = '+scoreTable+'.dirtypantie_id) WHERE dirtypantie.id = ?').get(dirtypantieId);
  
  if (_.isEmpty(dirtypantie)) {
    res.end(JSON.stringify({
      status: 'fail',
      message: 'not_exist',
    }));
  }

  let dirtypantieData = jsondata.dirtypantie(dirtypantie, scoreTable);
  
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    status: 'success',
    message: 'success',
    dirtypantie: dirtypantieData
  }));
});

router.get('/:id/similar', function(req, res, next) {
  let dirtypantieId = req.params.id;
  let useTraitNormalization = req.query.trait_normalization;

  let scoreTable = 'dirtypantie_scores';
  if (useTraitNormalization == '1') {
    useTraitNormalization = '1';
    scoreTable = 'normalized_dirtypantie_scores';
  } else {
    useTraitNormalization = '0';
  }

  let dirtypantie = db.prepare('SELECT dirtypantie.*, '+scoreTable+'.rarity_rank FROM dirtypantie INNER JOIN '+scoreTable+' ON (dirtypantie.id = '+scoreTable+'.dirtypantie_id) WHERE dirtypantie.id = ?').get(dirtypantieId);
  let dirtypantieScore = db.prepare('SELECT '+scoreTable+'.* FROM '+scoreTable+' WHERE '+scoreTable+'.dirtypantie_id = ?').get(dirtypantieId);
  let allTraitTypes = db.prepare('SELECT trait_types.* FROM trait_types').all();
  let similarCondition = '';
  let similarTo = {};
  let similarDirtypanties = null;
  if (dirtypantieScore) {
    allTraitTypes.forEach(traitType => {
      similarCondition = similarCondition + 'IIF('+scoreTable+'.trait_type_'+traitType.id+'_value = :trait_type_'+traitType.id+', 1 * '+scoreTable+'.trait_type_'+traitType.id+'_rarity, 0) + ';
      similarTo['trait_type_'+traitType.id] = dirtypantieScore['trait_type_'+traitType.id+'_value'];
    });
    similarTo['trait_count'] = dirtypantieScore['trait_count'];
    similarTo['this_dirtypantie_id'] = dirtypantieId;
    similarDirtypanties = db.prepare(`
      SELECT
        dirtypantie.*,
        `+scoreTable+`.dirtypantie_id, 
        (
          ` 
          + similarCondition +
          `
          IIF(`+scoreTable+`.trait_count = :trait_count, 1 * 0, 0)
        )
        similar 
      FROM `+scoreTable+`  
      INNER JOIN dirtypantie ON (`+scoreTable+`.dirtypantie_id = dirtypantie.id)
      WHERE `+scoreTable+`.dirtypantie_id != :this_dirtypantie_id
      ORDER BY similar desc
      LIMIT 12
      `).all(similarTo);
  }

  
  let title = config.collection_name + ' | ' + config.app_name;
  let description = config.collection_description + ' | ' + config.app_description
  if (!_.isEmpty(dirtypantie)) {
    title = dirtypantie.name + ' | ' + config.app_name;
  }

  res.render('similar_dirtypantie', { 
    appTitle: title,
    appDescription: description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    ogImage: dirtypantie,
    activeTab: 'rarity',
    dirtypantie: dirtypantie,
    similarDirtypanties: similarDirtypanties,
    trait_normalization: useTraitNormalization,
    _: _
  });
});

module.exports = router;
