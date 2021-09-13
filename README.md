# Cool Rarity

Cool Rarity is an open source package for easy rarity score calculation. 

Cool Rarity was born in a [Hackathon](https://github.com/punkscape/01-rarity-analyser-hackathon) hosted by [PunkScape](https://punkscape.xyz/), made with love by [Fukuball](https://twitter.com/fukuball). It is easy to configure for developers and easy to use for users, any ERC721 NFT collection with [OpenSea metadata stardard](https://docs.opensea.io/docs/metadata-standards) can use Cool Rarity as the rarity score calculation tool. If you have the collection metadata in hand, you can depoly Cool Rarity as your collection rarity tool in minues!

Here's the demo, One Day Punk rarity website: [https://onedaypunk-rarity-tool.herokuapp.com/](https://onedaypunk-rarity-tool.herokuapp.com/)

## Prerequisites

Cool Rarity was built using Node.js, so you have to install:

- Node.js (v14.x)
- NPM

I personally use Yarn and NVM, so you can consider install them too:

- Yarn
- NVM

## Run Cool Rarity locally

### Step 1: Clone from GitHub

```
$ git clone https://github.com/fukuball/rarity-analyser.git
```

### Step 2: Configure collection data

You should have the collection metadata on hand, or you can use the default [collection.json](https://github.com/fukuball/rarity-analyser/blob/main/config/collection.json) provided by Cool Rarity, be sure your collection metadata is formated like the default collection.json.

Put your collection metadata json file (all token metadata in one json file!) in `config` folder, the same location as the default collection.json, then open the `config.js` in the folder, modify it for your collection.

Here's the content of `config.js`:

```
{
    app_name: 'Cool Rarity',
    collection_file_name: 'collection.json',
    collection_contract_address: '0x5537d90a4a2dc9d9b37bab49b490cf67d4c54e91',
    collection_name: '10k One Day Punks',
    sqlite_file_name: 'database.sqlite',
    ga: 'G-BW69Z04YTP',
    main_og_image: 'https://onedaypunk-rarity-tool.herokuapp.com/images/og.png'
}
```

- `app_name`: You can name your rarity app here.
- `collection_file_name`: Your NFT collection metadata file name, the metadata file you put in `config` folder.
- `collection_contract_address`: Your NFT collection smart contract address, will use to show the "View on OpenSea" link.
- `collection_name`: Your NFT collection name.
- `sqlite_file_name`: SQLite database file name, no need to change.
- `ga`: If you want to use Google Analytic, then change to your code.
- `main_og_image`: You can set default open graph image here.

### Step 3: Install package

```
$ yarn install
```

When package installed, postinstall script will be tiggered, and the `./cmd/rarity_analyze.js` will run for the first install. This will take some time for the rarity score calculation. (generally in minues)

### Final Step: Run

```
$ DEBUG=rarity-analyser:* yarn start-dev
```

Then open: http://localhost:3000/ on your web browser. Yes! Now you see the rarity website of your NFT collection!

## Deploy to Heroku

### Step 1: Prerequisites

- Register Heroku account
- Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

### Step 2: Login and Create App

In your Cool Rarity folder:

```
$ heroku login
```

```
$ heroku create
```

### Final Step: Deploy

```
$ git push heroku main
```

If you have any update want to deploy to Heroku, just use this final step to deploy to Heroku.

## Tasks

### Hackathon Tasks

- [V] The app lets the deployer configure a collection json file like this one: [collection.json](https://github.com/fukuball/rarity-analyser/blob/main/config/collection.json)
- [V] Take all metadata items and analyse their `attributes`.
- [V] Derive a rarity score for each attribute of each NFT item. Example: Property "Type", Attribute "Ape"; 24 of 10000 have this attribute/property combination; `rarity_score = 1/(24/10000) = 416.67`
- [V] Derive a rarity score for each NFT in the collection. The rarity score for each NFT is the **sum of all attributes**.
- [V] Account for missing `trait_type`s of an NFT.
- [V] Account for the `trait_count` of an NFT.
- [V] Calculate the Rarity Score for each token (SUM of all rare trait attributes / missing traits / trait counts).
- [ ] Compute and store a `collection-rarities.json` file which can be exported for use elsewhere for the given collection.

### Additional Tasks

- [V] Search by ID and sort by rarity or ID.
- [V] Put OpenSea link and PunkScape link.
- [ ] Endpoint of JSON rarity data for every punk.
