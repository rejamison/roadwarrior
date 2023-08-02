const cvs = require("canvas");
const fs = require("fs");
const rnd = require("./randomizer.js");
const Cardistry = require('./cardistry.js');
const {Card, BoundaryRect, GridCard, RotatedTextBox, TextBox, ImageManager} = require("./cardistry");
const {loadImage} = require("canvas");
const {getAuthToken, getSheet, getSheetValues, download} = require('./gutil');

const SHEET_ID = '13Of7uumH7h1DKWzTMfgaTGnJmjlnC7CSuH2TnDdxsiI';

const COLORS = {
    'blue': '00449F',
    'black': 'FFFFFF',
    'green': '71D358',
    'orange': 'FF824A',
    'purple': 'C462DD',
    'red': 'FF001C',
    'yellow': 'FFD65B',
    'grey': 'D3D3D3',
    'gray': 'D3D3D3'
};

// setup the randomizer
rnd.seed(Date.now().toString());
// rnd.seed('1673045739034');
console.log('initializing with seed ' + rnd.getSeedString());

// register fonts
cvs.registerFont('lib/rokkitt/static/Rokkitt-Bold.ttf', {family: 'Rokkitt Bold'});
cvs.registerFont('lib/rokkitt/static/Rokkitt-Light.ttf', {family: 'Rokkitt Light'});

// load images
const im = new ImageManager();

// create needed directories
if(!fs.existsSync('var')) fs.mkdirSync('var');
if(!fs.existsSync('tmp')) fs.mkdirSync('tmp');

const CARD_BLEED = 0.125;
const CARD_SAFE = 0.125;
const CARD_HEIGHT = 2.48 + CARD_BLEED * 2;
const CARD_WIDTH = 1.61 + CARD_BLEED * 2;
const CARD_EXTRA = 0.05;
const DEFAULT_CARD_BG_COLOR = 'FFFFFF';
const DEFAULT_TEXT_SIZE = (CARD_HEIGHT - 0.6) / 10.5;
const DEFAULT_TEXT_MARGIN = DEFAULT_TEXT_SIZE * 0.23;
const DEFAULT_DPI = 300;
const D6_WIDTH = 0.5;
const D6_HEIGHT = 0.5;

function keysToImages(str) {
    if(str.trim().length == 0) {
        return [];
    } else {
        return str.split(/[ ,]+/).map(tag => im.get(tag));
    }
}

function rowsToObjects(rows) {
    let objects = {};
    let col_names = [];
    for(let col_name of rows[0]) {
        col_names.push(col_name);
    }
    for(let row of rows.slice(1)) {
        let obj = {};
        for(let i = 0; i < col_names.length; i++) {
            obj[col_names[i]] = row[i];
        }
        objects[row[0]] = obj;
    }
    return objects;
}

class RoadWarriorItemCard extends Cardistry.Card {
    constructor(title, body, hp, dice) {
        super(CARD_WIDTH, CARD_HEIGHT, CARD_BLEED, CARD_SAFE, CARD_EXTRA, DEFAULT_CARD_BG_COLOR, DEFAULT_DPI);

        this.title = title;
        this.body = body;
        this.hp = hp;
        if(dice.trim().length != 0) {
            this.dice = dice.split(',').map((die) => die.trim());
        }

        // title
        this.addElement(new Cardistry.TextBox(
            this,
            this.title,
            'Rokkitt Bold',
            '000000',
            DEFAULT_TEXT_SIZE,
            0,
            'left',
            'top',
            this.getDrawableBoundRect().cutBottomPct(0.9),
            this.bgColor));
        this.addElement(new Cardistry.TextBox(
            this,
            this.body,
            'Rokkitt Bold',
            '000000',
            DEFAULT_TEXT_SIZE * 0.66,
            0,
            'left',
            'top',
            this.getDrawableBoundRect().cutTopPct(0.25),
            this.bgColor
        ));
        if(this.dice) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutPct(0, 0.8, 0.9, 0),
                this.bgColor,
                im.getRecolored('die', COLORS[this.dice[0]]),
                false
            ));
            if(this.dice.length == 2) {
                this.addElement(new Cardistry.ImageBox(
                    this,
                    this.getDrawableBoundRect().cutPct(0.2, 0.6, 0.9, 0),
                    this.bgColor,
                    im.getRecolored('die', COLORS[this.dice[1]]),
                    false
                ));
            } else if(this.dice.length == 3) {
                this.addElement(new Cardistry.ImageBox(
                    this,
                    this.getDrawableBoundRect().cutPct(0.4, 0.4, 0.9, 0),
                    this.bgColor,
                    im.getRecolored('die', COLORS[this.dice[2]]),
                    false
                ));
            } else {
                console.error("Strange number of dice detected in card: " + this.title);
            }
        }
        if(this.hp.trim().length != 0) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutPct(0.8, 0, 0.9, 0),
                this.bgColor,
                im.get('shield'),
                false
            ));
            this.addElement(new Cardistry.TextBox(
                this,
                '' + hp,
                'Rokkitt Bold',
                '000000',
                DEFAULT_TEXT_SIZE * 0.75,
                0,
                'center',
                'middle',
                this.getDrawableBoundRect().cutPct(0.8, 0, 0.9, 0),
                this.bgColor
            ));
        }

    }
}

// TODO:  Make dark dice icons white...
class RoadWarriorDie extends Cardistry.Sheet {
    constructor(bgColor, faces) {
        let cards = [];
        for(const face of faces) {
            let die = new Cardistry.DieFace(D6_WIDTH, D6_HEIGHT, 0, 0, 0, bgColor, 300, face);
            die.draw();
            cards.push(die);
        }

        super(cards);
    }
}

let dice = {};
let items = {};
async function loadSheet() {
    try {
        const auth = await getAuthToken();

        // load all the symbols
        const symbols_response = await getSheetValues(SHEET_ID,'Symbols', auth);
        for(const row of symbols_response.data.values.slice(1)) {
            if(row[1] && row[1].endsWith('view?usp=drive_link')) {
                const id = row[1].replace(/https:\/\/drive\.google\.com\/file\/d\/(.*?)\/.*?\?usp=drive_link/g, "$1");
                const file = await download(id, auth);
                im.loadImage(row[0], file);
            } else {
                im.loadImage(row[0], row[1]);
            }
        }

        // load all the dice
        const dice_response = await getSheetValues(SHEET_ID, 'Dice', auth);
        dice = rowsToObjects(dice_response.data.values);

        // load all the items
        const items_response = await getSheetValues(SHEET_ID, 'Items', auth);
        items = rowsToObjects(items_response.data.values);
    } catch(error) {
        console.log(error.message, error.stack);
    }
}

async function main() {
    await loadSheet();

    im.ready(() => {
        // generate dice
        for(let die of Object.values(dice)) {
            let rwd = new RoadWarriorDie(COLORS[die['Color']], [
                keysToImages(die['Face 1']),
                keysToImages(die['Face 2']),
                keysToImages(die['Face 3']),
                keysToImages(die['Face 4']),
                keysToImages(die['Face 5']),
                keysToImages(die['Face 6'])
            ]);
            rwd.exportPNG('var/' + die['Tag'] + ".png", 3);
        }

        // generate items
        // TODO: add support for icons in text
        // TODO: card backs and split decks by tier
        let item_cards = [];
        for(let item of Object.values(items)) {
            let card = new RoadWarriorItemCard(item['Name Text'], item['Body Text'], item['HP'], item['Dice']);
            card.draw();
            for(let i = 0; i < item['Qty']; i++) {
                item_cards.push(card);
            }
        }
        let item_sheet = new Cardistry.Sheet(item_cards);
        item_sheet.exportScaledPNG('var/items.png', 5, 1, true, false);

        // TODO: upload sheets to google drive
    });
}
main();
