const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const fs = require('fs');
const Database = require('better-sqlite3');
const _ = require('lodash');

let databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (!fs.existsSync(databasePath)) {
  databasePath = appRoot + '/config/database.sqlite.sample';
}

const db = new Database(databasePath);

exports.dirtypantie = function (dirtypantie, scoreTable) {
  let dirtypantieId = dirtypantie.id;
  let dirtypantieTraits = db.prepare('SELECT dirtypantie_traits.trait_type_id, trait_types.trait_type, dirtypantie_traits.value  FROM dirtypantie_traits INNER JOIN trait_types ON (dirtypantie_traits.trait_type_id = trait_types.id) WHERE dirtypantie_traits.dirtypantie_id = ?').all(dirtypantieId);
  let dirtypantieScore = db.prepare('SELECT '+scoreTable+'.* FROM '+scoreTable+' WHERE '+scoreTable+'.dirtypantie_id = ?').get(dirtypantieId);
  let allTraitTypes = db.prepare('SELECT trait_types.* FROM trait_types').all();
  
  let dirtypantieTraitsData = [];
  let dirtypantieTraitIDs = [];
  dirtypantieTraits.forEach(dirtypantieTrait => {
    let percentile = dirtypantieScore['trait_type_'+dirtypantieTrait.trait_type_id+'_percentile'];
    let rarity_score = dirtypantieScore['trait_type_'+dirtypantieTrait.trait_type_id+'_rarity'];
    dirtypantieTraitsData.push({
      trait_type: dirtypantieTrait.trait_type,
      value: dirtypantieTrait.value,
      percentile: percentile,
      rarity_score: rarity_score,
    });
    dirtypantieTraitIDs.push(dirtypantieTrait.trait_type_id);
  });

  let missingTraitsData = [];
  allTraitTypes.forEach(traitType => {
    if (!dirtypantieTraitIDs.includes(traitType.id)) {
      let percentile = dirtypantieScore['trait_type_'+traitType.id+'_percentile'];
      let rarity_score = dirtypantieScore['trait_type_'+traitType.id+'_rarity'];
      missingTraitsData.push({
        trait_type: traitType.trait_type,
        percentile: percentile,
        rarity_score: rarity_score,
      });
    }
  });

  return {
    id: dirtypantie.id,
    name: dirtypantie.name,
    image: dirtypantie.image,
    attributes: dirtypantieTraitsData,
    missing_traits: missingTraitsData,
    trait_count: {
      count: dirtypantieScore.trait_count,
      percentile: dirtypantieScore.trait_count_percentile,
      rarity_score: dirtypantieScore.trait_count_rarity
    },
    rarity_score: dirtypantieScore.rarity_sum,
    rarity_rank: dirtypantieScore.rarity_rank
  };
};
