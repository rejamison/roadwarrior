const cvs = require("canvas");
const fs = require("fs");
const rnd = require("./randomizer.js");
const Cardistry = require('./cardistry.js');
const {Card, BoundaryRect, GridCard, RotatedTextBox, TextBox, ImageManager} = require("./cardistry");
const {loadImage} = require("canvas");
const {getAuthToken, getSheet, getSheetValues, download, upload} = require('./gutil');

const SHEET_ID = '13Of7uumH7h1DKWzTMfgaTGnJmjlnC7CSuH2TnDdxsiI';
const ASSET_FOLDER_ID = '1_c-ZMmwW4eUmKRfLA66aiWfX6qoMu_Ez';

const COLORS = {
    'blue': '00449F',
    'black': '000000',
    'green': '71D358',
    'orange': 'FF824A',
    'purple': 'C462DD',
    'red': 'FF001C',
    'yellow': 'FFD65B',
    'grey': 'D3D3D3',
    'gray': 'D3D3D3',
    'pink': 'FFC0CB',
    'light_gray': 'E8E8E8',
    'light_grey': 'E8E8E8',
    'white': 'FFFFFF'
};
const FONTS = {
    'rokkitt': 'Rokkitt',
    'rokkitt_bold': 'Rokkitt Bold',
    'rokkitt_light': 'Rokkitt Light'
}

// setup the randomizer
rnd.seed(Date.now().toString());
// rnd.seed('1673045739034');
console.log('initializing with seed ' + rnd.getSeedString());

// register fonts
cvs.registerFont('lib/rokkitt/static/Rokkitt-Bold.ttf', {family: FONTS.rokkitt_bold});
cvs.registerFont('lib/rokkitt/static/Rokkitt-Light.ttf', {family: FONTS.rokkitt_light});

// load images
const im = new ImageManager();

// create needed directories
if(!fs.existsSync('var')) fs.mkdirSync('var');
if(!fs.existsSync('tmp')) fs.mkdirSync('tmp');
if(!fs.existsSync('var/tts')) fs.mkdirSync('var/tts');
if(!fs.existsSync('var/pnp')) fs.mkdirSync('var/pnp');

const CARD_BLEED = 0.125;
const CARD_SAFE = 0.125;
const CARD_HEIGHT = 2.48 + CARD_BLEED * 2;
const CARD_WIDTH = 1.61 + CARD_BLEED * 2;
const CARD_EXTRA = 0.05;
const DEFAULT_CARD_BG_COLOR = COLORS.white;
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

function keysToInvertedImages(str, bgColor) {
    if(str.trim().length == 0) {
        return [];
    } else {
        return str.split(/[ ,]+/).map(tag => im.getInverted(tag, COLORS.white, COLORS.black, bgColor));
    }
}

function renderArc(str) {
    if(str && str.trim().length > 0) {
        if(str === 'any') {
            return im.get('any');
        } else if(str === 'by_slot') {
            return im.get('by_slot');
        } else {
            let arcs = keysToImages(str);
            arcs.push(im.get('arc'));
            const canvas = cvs.createCanvas(arcs[0].width, arcs[0].height);
            const ctx = canvas.getContext('2d');
            for(let arc of arcs) {
                ctx.drawImage(arc, 0, 0);
            }
            return canvas;
        }
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

function addImagesRow(parent, images, boundaryRect, bgColor) {
    if(images && images.length > 0) {
        for(let i = 0; i < images.length; i++) {
            let image = images[i];
            if(image) {
                parent.addElement(new Cardistry.ImageBox(
                    parent,
                    boundaryRect.cutPct((1 / images.length) * i, (1 / images.length) * (images.length - i - 1), 0, 0),
                    bgColor ? bgColor : parent.bgColor,
                    image,
                    false
                ));
            } else {
                console.error('Missing image...');
            }
        }
    }
}

function someOrNone(str) {
    if(!str) {
        return null;
    } else if(str.trim().length == 0) {
        return null;
    } else {
        return str.trim();
    }
}

function convertToFilename(str) {
    return str.toLowerCase().replace(/[ -]+/g, '_');
}

function decksByFields(deck, field1, field2) {
    let decks = {};

    for(let card of Object.values(deck)) {
        let key = (field1 && field2) ? card[field1] + ' ' + card[field2] : card[field1];
        let obj = decks[key];
        if(!obj) {
            decks[key] = {};
            obj = decks[key];
        }
        decks[key][card['Tag']] = card;
    }

    return decks;
}

class RoadWarriorCardBack extends Cardistry.Card {
    constructor(deckName, iconImage, bgColor, textColor, isLandscape) {
        super(isLandscape ? CARD_HEIGHT : CARD_WIDTH, isLandscape ? CARD_WIDTH : CARD_HEIGHT, CARD_BLEED, CARD_SAFE, CARD_EXTRA, bgColor, DEFAULT_DPI);

        this.deckName = deckName;
        this.deckImage = iconImage;
        this.textColor = textColor;

        if(this.deckImage) {
            this.addElement(new Cardistry.TextBox(
                this,
                this.deckName,
                FONTS.rokkitt_bold,
                this.textColor,
                DEFAULT_TEXT_SIZE,
                0,
                'center',
                'middle',
                this.getDrawableBoundRect().cutTopPct(0.5),
                this.bgColor));
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutBottomPct(0.5),
                this.bgColor,
                this.deckImage,
                false
            ));
        } else {
            this.addElement(new Cardistry.TextBox(
                this,
                this.deckName,
                FONTS.rokkitt_bold,
                this.textColor,
                DEFAULT_TEXT_SIZE * 1.75,
                0,
                'center',
                'middle',
                this.getDrawableBoundRect(),
                this.bgColor));
        }
    }
}

class RoadWarriorItemCard extends Cardistry.Card {
    constructor(title, body, hp, dice, slots, attackCost, attackEffect, attackArc, attackRange) {
        super(CARD_WIDTH, CARD_HEIGHT, CARD_BLEED, CARD_SAFE, CARD_EXTRA, DEFAULT_CARD_BG_COLOR, DEFAULT_DPI);

        this.title = title;
        this.body = body;
        this.hp = someOrNone(hp);
        if(someOrNone(dice)) {
            this.dice = dice.split(',').map((die) => die.trim());
        }
        // TODO: Use different images for slots vs. arcs?
        this.slotsImage = renderArc(slots);
        this.attackCostImages = keysToImages(attackCost);
        this.attackEffectText = attackEffect;
        this.attackArcImage = renderArc(attackArc);
        this.attackRange = attackRange;

        // title
        this.addElement(new Cardistry.TextBox(
            this,
            this.title,
            FONTS.rokkitt_bold,
            COLORS.black,
            DEFAULT_TEXT_SIZE * 0.75,
            0,
            'left',
            'top',
            this.getDrawableBoundRect().cutPct(0, 0.2, 0, 0.8),
            this.bgColor));

        if(this.attackCostImages.length > 0) {
            let attackBoxRect = this.getDrawableBoundRect().cutPct(0, 0, 0.2, 0.2);
            let attackBoxBgColor = COLORS['gray'];
            this.addElement(new Cardistry.Box(this, attackBoxRect, attackBoxBgColor));
            attackBoxRect = attackBoxRect.shrink(20);
            addImagesRow(this, this.attackCostImages, attackBoxRect.cutPct(0, 0.66, 0, 0.8), attackBoxBgColor);
            this.addElement(new Cardistry.ImageBox(
                this,
                attackBoxRect.cutPct(0, 0.66, 0.2, 0.2),
                attackBoxBgColor,
                this.attackArcImage,
                false
            ));
            this.addElement(new Cardistry.TextBox(
                this,
                this.attackEffectText,
                FONTS.rokkitt,
                COLORS.black,
                DEFAULT_TEXT_SIZE * 0.6,
                0,
                'left',
                'middle',
                attackBoxRect.cutPct(0.33, 0, 0, 0).cutLeft(20),
                attackBoxBgColor
            ));
            this.addElement(new Cardistry.TextBox(
                this,
                this.attackRange,
                FONTS.rokkitt_bold,
                COLORS.black,
                DEFAULT_TEXT_SIZE * 0.5,
                0,
                'center',
                'middle',
                attackBoxRect.cutPct(0, 0.66, 0.8, 0),
                attackBoxBgColor
            ));
        } else {
            // TODO: Support for inline symbols...
            this.addElement(new Cardistry.TextBox(
                this,
                this.body,
                FONTS.rokkitt,
                COLORS.black,
                DEFAULT_TEXT_SIZE * 0.7,
                0,
                'left',
                'middle',
                this.getDrawableBoundRect().cutPct(0, 0, 0.2, 0.1),
                this.bgColor
            ));
        }
        if(this.slotsImage) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutPct(0.8, 0, 0, 0.9),
                this.bgColor,
                this.slotsImage,
                false
            ));
        }
        if(this.dice) {
            addImagesRow(this, this.dice.map((x) => im.getRecolored('die', COLORS[x])), this.getDrawableBoundRect().cutPct(0, 0.5, 0.9, 0));
        }
        if(this.hp) {
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
                FONTS.rokkitt_bold,
                COLORS.black,
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

class RoadWarriorAICard extends Cardistry.Card {
    constructor(faction, vehicle, vehicleIcon, title, arc, body, chain) {
        super(CARD_WIDTH, CARD_HEIGHT, CARD_BLEED, CARD_SAFE, CARD_EXTRA, DEFAULT_CARD_BG_COLOR, DEFAULT_DPI);

        this.faction = faction;
        this.vehicle = vehicle;
        this.vehicleIconImage = im.get(vehicleIcon);
        this.title = title;
        this.attackArcImage = renderArc(arc);
        this.body = body;
        this.chainImage = chain === 'Y' ? im.get('chain') : null;

        // title
        this.addElement(new Cardistry.TextBox(
            this,
            this.title,
            FONTS.rokkitt_bold,
            COLORS.black,
            DEFAULT_TEXT_SIZE * 0.75,
            0,
            'left',
            'top',
            this.getDrawableBoundRect().cutPct(0, 0.2, 0, 0.8),
            this.bgColor));
        this.addElement(new Cardistry.ImageBox(
            this,
            this.getDrawableBoundRect().cutPct(0, 0, 0.2, 0.55),
            this.bgColor,
            this.attackArcImage,
            false
        ));
        this.addElement(new Cardistry.TextBox(
            this,
            this.body,
            FONTS.rokkitt,
            COLORS.black,
            DEFAULT_TEXT_SIZE * 0.65,
            0,
            'left',
            'middle',
            this.getDrawableBoundRect().cutPct(0, 0, 0.45, 0),
            this.bgColor
        ));
        if(this.chainImage) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutPct(0.8, 0, 0.9, 0),
                this.bgColor,
                this.chainImage,
                false
            ));
        }
        if(this.vehicleIconImage) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutPct(0.8, 0, 0, 0.9),
                this.bgColor,
                this.vehicleIconImage,
                false
            ));
        }
    }
}

class RoadWarriorInitiativeCard extends Cardistry.Card {
    constructor(faction, name, vehicleIcon, hp, color, toughness, quantity) {
        super(CARD_HEIGHT, CARD_WIDTH, CARD_BLEED, CARD_SAFE, CARD_EXTRA, DEFAULT_CARD_BG_COLOR, DEFAULT_DPI);

        this.faction = faction;
        this.name = name;
        this.vehicleIconImage = im.get(vehicleIcon);
        this.hp = someOrNone(hp);
        this.color = someOrNone(color);
        this.toughness = someOrNone(toughness);
        this.quantity = someOrNone(quantity);

        this.addElement(new Cardistry.TextBox(
            this,
            this.faction + '\n' + this.name,
            FONTS.rokkitt_bold,
            COLORS.black,
            DEFAULT_TEXT_SIZE * 1.2,
            0,
            'center',
            'middle',
            this.getDrawableBoundRect().shrink(100),
            this.bgColor));
        if(this.toughness) {
            this.addElement(new Cardistry.TextBox(
                this,
                this.toughness,
                FONTS.rokkitt_bold,
                COLORS.black,
                DEFAULT_TEXT_SIZE * 1.1,
                0,
                'center',
                'middle',
                this.getDrawableBoundRect().cutPct(0.85, 0, 0, 0.7),
                this.bgColor
            ));
        }
        if(this.quantity) {
            this.addElement(new Cardistry.TextBox(
                this,
                this.quantity + 'X',
                FONTS.rokkitt_bold,
                COLORS.black,
                DEFAULT_TEXT_SIZE * 1.1,
                0,
                'center',
                'middle',
                this.getDrawableBoundRect().cutPct(0, 0.85, 0.7, 0),
                this.bgColor
            ));
        }
        if(this.color) {
            this.addElement(new Cardistry.Box(
                this,
                this.getDrawableBoundRect().cutPct(0, 0.85, 0, 0.7),
                COLORS[this.color]
            ));
        }
        if(this.hp) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutPct(0.85, 0, 0.7, 0),
                this.bgColor,
                im.get('shield'),
                false
            ));
            this.addElement(new Cardistry.TextBox(
                this,
                '' + hp,
                FONTS.rokkitt_bold,
                COLORS.black,
                DEFAULT_TEXT_SIZE * 1.1,
                0,
                'center',
                'middle',
                this.getDrawableBoundRect().cutPct(0.85, 0, 0.7, 0),
                this.bgColor
            ));
        }
    }
}

class RoadWarriorDie extends Cardistry.Sheet {
    constructor(bgColor, faces) {
        let cards = [];
        for(const face of faces) {
            let die = new Cardistry.DieFace(D6_WIDTH, D6_HEIGHT, 0.05, 0, 0, bgColor, 300, face);
            die.draw();
            cards.push(die);
        }

        super(cards);
    }
}

let dice = {};
let items = {};
let vehicles = {};
let ais = {};
let tokens = {};
let auth = null;
async function exportAndUpload(sheet, path) {
    sheet.exportPNG(path).then((path) => {
        return upload(ASSET_FOLDER_ID, path, auth);
    });
}
async function exportScaledAndUpload(sheet, path, columns, pct, excludePrintableArea, includeHashMarks) {
    sheet.exportScaledPNG(path, columns, pct, excludePrintableArea, includeHashMarks).then((path) => {
        return upload(ASSET_FOLDER_ID, path, auth);
    });
}
async function loadSheet() {
    try {
        auth = await getAuthToken();

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
        items = decksByFields(rowsToObjects(items_response.data.values), 'Tier');

        // load all the vehicles
        const vehicles_response = await getSheetValues(SHEET_ID, 'Vehicles', auth);
        vehicles = rowsToObjects(vehicles_response.data.values);

        // load all the ais
        const ais_response = await getSheetValues(SHEET_ID, 'Enemy AI', auth);
        ais = decksByFields(rowsToObjects(ais_response.data.values), 'Faction', 'Vehicle');

        // load all the tokens
        const tokens_response = await getSheetValues(SHEET_ID, 'Tokens', auth);
        tokens = rowsToObjects(tokens_response.data.values);
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
                keysToInvertedImages(die['Face 1'], COLORS[die['Color']]),
                keysToInvertedImages(die['Face 2'], COLORS[die['Color']]),
                keysToInvertedImages(die['Face 3'], COLORS[die['Color']]),
                keysToInvertedImages(die['Face 4'], COLORS[die['Color']]),
                keysToInvertedImages(die['Face 5'], COLORS[die['Color']]),
                keysToInvertedImages(die['Face 6'], COLORS[die['Color']])
            ]);
            rwd.exportPNG('tmp/' + die['Tag'] + ".png", 3).then(() => {
                loadImage('tmp/' + die['Tag'] + ".png").then((img) => {
                    const canvas = cvs.createCanvas(img.width, img.height * 1.5);
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#' + COLORS[die['Color']];
                    ctx.fillRect(0, 0, img.width, img.height * 1.5);
                    ctx.drawImage(img, 0, img.height * 0.5);
                    const out = fs.createWriteStream('var/tts/' + die['Tag'] + ".png");
                    canvas.createPNGStream().pipe(out);
                    upload(ASSET_FOLDER_ID, 'var/tts/' + die['Tag'] + ".png", auth);
                });
            });
        }

        // generate items
        // TODO: add support for icons in text
        for(let deckName in items) {
            let deck = items[deckName];
            let item_cards = [];
            for(let item of Object.values(deck)) {
                let card = new RoadWarriorItemCard(
                    item['Name Text'],
                    item['Body Text'],
                    item['HP'],
                    item['Dice'],
                    item['Slots'],
                    item['Attack Cost'],
                    item['Attack Effect'],
                    item['Attack Arc'],
                    item['Attack Range']);
                card.draw();
                for(let i = 0; i < item['Qty']; i++) {
                    item_cards.push(card);
                }
            }
            let item_sheet = new Cardistry.Sheet(item_cards);
            exportScaledAndUpload(item_sheet, 'var/tts/item_' + convertToFilename(deckName) + '_fronts.png', 5, 1, true, false);
            let item_back = new RoadWarriorCardBack(deckName + ' Items', null, COLORS.blue, COLORS.white);
            item_back.draw();
            exportAndUpload(item_back, 'var/tts/item_' + convertToFilename(deckName) + '_back.png')
        }

        // generate initiative cards
        let init_cards = [];
        for(let vehicle of Object.values(vehicles)) {
            let card = new RoadWarriorInitiativeCard(
                vehicle['Faction'],
                vehicle['Name Text'],
                vehicle['Vehicle Icon'],
                vehicle['HP'],
                vehicle['Color'],
                vehicle['Tough.'],
                vehicle['Qty']
            )
            card.draw();
            init_cards.push(card);
        }
        let init_sheet = new Cardistry.Sheet(init_cards);
        exportScaledAndUpload(init_sheet, 'var/tts/initiative_fronts.png', 3, 1, true, false);
        init_sheet.exportScaledPNG('var/pnp/initiative_fronts.png', 3, 1, true, true);
        let init_back = new RoadWarriorCardBack('INITIATIVE', null, COLORS.red, COLORS.white, true);
        init_back.draw();
        exportAndUpload(init_back, 'var/tts/initiative_back.png');

        // generate AI cards
        for(let deckName in ais) {
            let deck = ais[deckName];
            let ai_cards = [];
            for (let ai of Object.values(deck)) {
                let card = new RoadWarriorAICard(
                    ai['Faction'],
                    ai['Vehicle'],
                    ai['Vehicle Icon'],
                    ai['Name Text'],
                    ai['Arc'],
                    ai['Body Text'],
                    ai['Chain?']
                )
                card.draw();
                for (let i = 0; i < ai['Qty']; i++) {
                    ai_cards.push(card);
                }
            }
            let ai_sheet = new Cardistry.Sheet(ai_cards);
            exportScaledAndUpload(ai_sheet, 'var/tts/ai_' + convertToFilename(deckName) + '_fronts.png', 5, 1, true, false);
            ai_sheet.exportScaledPNG('var/pnp/ai_' + convertToFilename(deckName) + '_fronts.png', 5, 1, true, true);
            let ai_back = new RoadWarriorCardBack(deckName + ' AI', ai_cards[0].vehicleIconImage, COLORS.gray, COLORS.black);
            ai_back.draw();
            exportAndUpload(ai_back, 'var/tts/ai_' + convertToFilename(deckName) + '_back.png');
        }

        // generate tokens
        for(let token of Object.values(tokens)) {
            let tokenImage = im.get(token['Icon']);
            const canvas = cvs.createCanvas(tokenImage.width, tokenImage.height);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#' + COLORS.white;
            ctx.fillRect(0, 0, tokenImage.width, tokenImage.height);
            ctx.drawImage(tokenImage, 0, 0);
            const out = fs.createWriteStream('var/tts/' + token['Tag'] + ".png");
            canvas.createPNGStream().pipe(out);
            upload(ASSET_FOLDER_ID, 'var/tts/' + token['Tag'] + ".png", auth);
        }

        // TODO: Scenario cards
    });
}
main();
