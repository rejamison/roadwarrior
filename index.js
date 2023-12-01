const cvs = require("canvas");
const fs = require("fs");
const rnd = require("./randomizer.js");
const Cardistry = require('./cardistry.js');
const {Card, BoundaryRect, GridCard, RotatedTextBox, TextBox, ImageManager, WordHighlighter, TextStyle, isDark, Mutator,
    H_ALIGN, V_ALIGN
} = require("./cardistry");
const {Canvas, loadImage} = require("canvas");
const {getAuthToken, getSheet, getSheetValues, download, upload} = require('./gutil');

const SHEET_ID = '13Of7uumH7h1DKWzTMfgaTGnJmjlnC7CSuH2TnDdxsiI';
const ASSET_FOLDER_ID = '1_c-ZMmwW4eUmKRfLA66aiWfX6qoMu_Ez';

// constants
const COLORS = {
    'blue': '00449F',
    'black': '000000',
    'green': '71D358',
    'orange': 'FF824A',
    'purple': '800080',
    'red': 'FF001C',
    'yellow': 'FFD65B',
    'grey': 'D3D3D3',
    'gray': 'D3D3D3',
    'pink': 'FFC0CB',
    'light_gray': 'E8E8E8',
    'light_grey': 'E8E8E8',
    'dark_grey': '888888',
    'dark_gray': '888888',
    'white': 'FFFFFF',
    'olive': '808000',
    'brown': '795548',
    'teal': '00ACC1',
    'tan': 'D2B48C',
    'dark_brown': '3C1B10',
};
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
const FONT_TYPES = {
    'rokkitt': 'Rokkitt',
    'rokkitt_bold': 'Rokkitt Bold',
    'rokkitt_light': 'Rokkitt Light',
    'archivo': 'Archivo',
    'fredericka': 'Fredericka',
    'alfaSlabOne': 'Alfa Slab One'
}
const STYLES = {
    fullBack: new TextStyle(FONT_TYPES.alfaSlabOne, DEFAULT_TEXT_SIZE * DEFAULT_DPI, COLORS.black, 'center', 'middle'),
    header: new TextStyle(FONT_TYPES.alfaSlabOne, DEFAULT_TEXT_SIZE * DEFAULT_DPI, COLORS.black, 'left', 'top'),
    body: new TextStyle(FONT_TYPES.rokkitt, DEFAULT_TEXT_SIZE * DEFAULT_DPI, COLORS.black, 'left', 'top'),
    bodyBold: new TextStyle(FONT_TYPES.rokkitt_bold, DEFAULT_TEXT_SIZE * DEFAULT_DPI, COLORS.black, 'left', 'top'),
}

// setup the randomizer
rnd.seed(Date.now().toString());
// rnd.seed('1673045739034');
console.log('initializing with seed ' + rnd.getSeedString());

// register fonts
cvs.registerFont('lib/rokkitt/static/Rokkitt-Bold.ttf', {family: FONT_TYPES.rokkitt_bold});
cvs.registerFont('lib/rokkitt/static/Rokkitt-Light.ttf', {family: FONT_TYPES.rokkitt_light});
cvs.registerFont('lib/Archivo_Black/ArchivoBlack-Regular.ttf', {family: FONT_TYPES.archivo});
cvs.registerFont('lib/Fredericka_the_Great/FrederickatheGreat-Regular.ttf', {family: FONT_TYPES.fredericka});
cvs.registerFont('lib/Alfa_Slab_One/AlfaSlabOne-Regular.ttf', {family: FONT_TYPES.alfaSlabOne});

// load images
const im = new ImageManager();

// create needed directories
if(!fs.existsSync('var')) fs.mkdirSync('var');
if(!fs.existsSync('tmp')) fs.mkdirSync('tmp');
if(!fs.existsSync('var/tts')) fs.mkdirSync('var/tts');
if(!fs.existsSync('var/pnp')) fs.mkdirSync('var/pnp');

// globals
let dice = {};
let items = {};
let vehicles = {};
let ais = {};
let tokens = {};
let scenarios = {};
let rules = {};
let auth = null;

/**
 *
 * @param {string} str
 * @returns {Canvas[]|Image[]}
 */
function keysToImages(str) {
    if(str.trim().length === 0) {
        return [];
    } else {
        return str.split(/[ ,]+/).map(tag => im.get(tag));
    }
}

/**
 *
 * @param {string} str
 * @param {string} bgColor
 * @returns {Canvas[]|Image[]}
 */
function keysToInvertedImages(str, bgColor) {
    if(str.trim().length === 0) {
        return [];
    } else {
        return str.split(/[ ,]+/).map(tag => im.getInverted(tag, COLORS.white, COLORS.black, bgColor));
    }
}

/**
 *
 * @param {string} str
 * @returns {Canvas|Image}
 */
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

/**
 *
 * @param {Object[]} rows
 * @returns {Object}
 */
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

/**
 *
 * @param {Cardistry.Card} parent
 * @param {Canvas|Image[]} images
 * @param {BoundaryRect} boundaryRect
 * @param {string} [bgColor]
 * @param {boolean} [stretch]
 * @param {string} [vAlign]
 * @param {string} [hAlign]
 */
function addImagesRow(parent, images, boundaryRect, bgColor, stretch, hAlign, vAlign) {
    if(images && images.length > 0) {
        for(let i = 0; i < images.length; i++) {
            let image = images[i];
            if(image) {
                parent.addElement(new Cardistry.ImageBox(
                    parent,
                    boundaryRect.cutPct((1 / images.length) * i, (1 / images.length) * (images.length - i - 1), 0, 0),
                    bgColor ? bgColor : parent.bgColor,
                    image,
                    false,
                    hAlign,
                    vAlign
                ));
            } else {
                console.error('Missing image...');
            }
        }
    }
}

/**
 *
 * @param {Cardistry.Card} parent
 * @param {Canvas|Image[]} images
 * @param {BoundaryRect} boundaryRect
 * @param {string} [bgColor]
 * @param {boolean} [stretch]
 * @param {string} [vAlign]
 * @param {string} [hAlign]
 */
function addImagesColumn(parent, images, boundaryRect, bgColor, stretch, hAlign, vAlign) {
    if(images && images.length > 0) {
        for(let i = 0; i < images.length; i++) {
            let image = images[i];
            if(image) {
                parent.addElement(new Cardistry.ImageBox(
                    parent,
                    boundaryRect.cutPct(0, 0, (1 / images.length) * i, (1 / images.length) * (images.length - i - 1)),
                    bgColor ? bgColor : parent.bgColor,
                    image,
                    false,
                    hAlign,
                    vAlign
                ));
            } else {
                console.error('Missing image...');
            }
        }
    }
}

/**
 *
 * @param {string} str
 * @returns {string|null}
 */
function someOrNone(str) {
    if(!str) {
        return null;
    } else if(str.trim().length === 0) {
        return null;
    } else {
        return str.trim();
    }
}

/**
 *
 * @param {string} str
 * @returns {string}
 */
function convertToFilename(str) {
    return str.toLowerCase().replace(/[ .-]+/g, '_');
}

/**
 *
 * @param {Object} deck
 * @param {string} field1
 * @param {string} [field2]
 * @returns {Object}
 */
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

class KeywordHighlighter extends WordHighlighter {
    constructor(keyword, style) {
        super(keyword, style);
    }
}

const glyphVerticalScaleFactor = 1.25;
const glyphVerticalMoveFactor = ((glyphVerticalScaleFactor - 1) / 2) / glyphVerticalScaleFactor;

class RangeGlyph extends Mutator {
    constructor() {
        super();
    }

    test(str) {
      return /range\([0-9]+\)/.test(str.toLowerCase());
    }

    measure(str, style, ctx) {
        const match = str.toLowerCase().match(/range\(([0-9]+)\)/);
        const range = parseInt(match[1]);
        return {
            w: style.size * 0.62 * range * glyphVerticalScaleFactor,
            h: style.size * 0.62 * glyphVerticalScaleFactor,
        }
    }
    
    mutate(str, style, ctx, boundRect) {
        const rangeIcon = im.getRecolored('hex', style.color);
        const match = str.toLowerCase().match(/range\(([0-9]+)\)/);
        const range = parseInt(match[1]);
        const br = boundRect.move(0, -boundRect.h * glyphVerticalMoveFactor);

        ctx.save();
        for(let i = 0; i < range; i++) {
            ctx.drawImage(rangeIcon, br.x + (br.w / range * i), br.y, br.w / range, br.h);
        }
        ctx.restore();
    }
}

class SymbolGlyph extends Mutator {
    constructor() {
        super();
    }

    test(str) {
        return /\{[a-z]+}/.test(str.toLowerCase());
    }

    measure(str, style, ctx) {
        return {
            w: style.size * 0.62 * glyphVerticalScaleFactor,
            h: style.size * 0.62 * glyphVerticalScaleFactor,
        }
    }

    mutate(str, style, ctx, boundRect) {
        const match = str.toLowerCase().match(/\{([a-z]+)}/);
        const key = match[1];
        const icon = im.getRecolored(key, style.color);
        const br = boundRect.move(0, -boundRect.h * glyphVerticalMoveFactor);
        if(icon) {
            ctx.save();
            ctx.drawImage(icon, br.x, br.y, br.h, br.h);
            ctx.restore();
        }
    }
}

class ActionGlyph extends Mutator {
    action
    color
    /** @type {RegExp} */
    re

    constructor(action, color) {
        super();

        this.action = action;
        this.color = color;
        this.re = new RegExp(this.action.toLowerCase() + '\\(([0-9x\\-\\>]+)\\),?');
    }

    test(str) {
        return this.re.test(str.toLowerCase());
    }

    measure(str, style, ctx) {
        const match = str.toLowerCase().match(this.re);
        const attackValue = match[1];

        ctx.save();
        style.refont(FONT_TYPES.archivo).scale(0.7).setCtx(ctx);
        let mLabel = ctx.measureText(this.action.toUpperCase());
        let mNum = ctx.measureText(attackValue.toUpperCase());
        ctx.restore();
        return {
            w: mLabel.width + mNum.width + (style.size * 0.8),
            h: style.size * 0.62 * glyphVerticalScaleFactor,
        };
    }

    mutate(str, style, ctx, boundRect) {
        const match = str.toLowerCase().match(this.re);
        const attackValue = match[1];
        const margin = style.size * 0.2;
        const br = boundRect.move(0, -boundRect.h * glyphVerticalMoveFactor);

        ctx.save();
        ctx.fillStyle = '#' + this.color;
        ctx.beginPath();
        ctx.roundRect(br.x, br.y, br.w, br.h, margin);
        ctx.fill();
        style.refont(FONT_TYPES.archivo).scale(0.7).recolor(COLORS.white).setCtx(ctx);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.action.toUpperCase(), br.x + margin, br.y + (br.h / 2), br.w);
        ctx.textAlign = 'right';
        ctx.fillText(attackValue.toUpperCase(), br.x + br.w - margin, br.y + (br.h / 2), br.w);
        ctx.restore();
    }
}

const GLYPHS = [
    new RangeGlyph(),
    new SymbolGlyph(),
    new ActionGlyph("Attack", COLORS.red),
    new ActionGlyph("Damage", COLORS.red),
    new ActionGlyph("Move", COLORS.black),
    new ActionGlyph("Fire", COLORS.orange),
    new ActionGlyph("Delay", COLORS.green),
    new ActionGlyph("Grapple", COLORS.green),
    new ActionGlyph("Board", COLORS.green),
    new ActionGlyph("Disable", COLORS.green),
    new ActionGlyph("Repair", COLORS.green),
    new ActionGlyph("Drop", COLORS.green),
    new ActionGlyph("Cooldown", COLORS.blue),
    new ActionGlyph("Push", COLORS.dark_gray),
    new ActionGlyph("Pull", COLORS.dark_gray),
    new ActionGlyph("Jump", COLORS.dark_gray),
    new ActionGlyph("Sentry", COLORS.black),
]

class RoadWarriorCardBack extends Cardistry.Card {
    deckName
    deckImage
    textColor

    constructor(deckName, iconImage, bgColor, textColor, isLandscape) {
        super(isLandscape ? CARD_HEIGHT : CARD_WIDTH, isLandscape ? CARD_WIDTH : CARD_HEIGHT, CARD_BLEED, CARD_SAFE, CARD_EXTRA, bgColor, DEFAULT_DPI);

        this.deckName = deckName;
        this.deckImage = iconImage;
        this.textColor = textColor;


        if(this.deckImage) {
            this.addElement(new Cardistry.TextBox(
                this,
                this.deckName,
                STYLES.fullBack.recolor(isDark(this.bgColor) ? COLORS.white : COLORS.black).scale(0.9),
                0,
                this.getDrawableBoundRect().cutTopPct(0.5),
                this.bgColor
            ));
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
                STYLES.fullBack.scale(1.5),
                0,
                this.getDrawableBoundRect(),
                this.bgColor));
        }
    }
}

class RoadWarriorItemCardBack extends Cardistry.Card {
    image

    constructor(image) {
        super(CARD_WIDTH, CARD_HEIGHT, CARD_BLEED, CARD_SAFE, CARD_EXTRA, COLORS.white, DEFAULT_DPI);

        this.image = image;

        this.addElement(new Cardistry.ImageBox(
            this,
            this.getFullBoundRect(),
            this.bgColor,
            this.image,
            true
        ));
    }
}

class RoadWarriorAICardBack extends Cardistry.Card {
    factionName
    unitLogo
    factionColor
    unitName

    constructor(factionName, factionColor, unitName, unitLogo) {
        super(CARD_WIDTH, CARD_HEIGHT, CARD_BLEED, CARD_SAFE, CARD_EXTRA, factionColor, DEFAULT_DPI);

        this.factionName = factionName;
        this.unitName = unitName;
        this.elementColor = isDark(this.factionColor) ? COLORS.white : COLORS.black;
        this.unitLogo = im.getRecolored(unitLogo, this.elementColor);
        this.factionColor = factionColor;

        if(this.unitLogo) {
            this.addElement(new Cardistry.TextBox(
                this,
                this.factionName,
                STYLES.fullBack.recolor(this.elementColor).scale(0.8).realign(H_ALIGN.center, V_ALIGN.top),
                0,
                this.getDrawableBoundRect().cutBottomPct(0.75),
                this.bgColor
            ));
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutTopPct(0.25).cutBottomPct(0.25),
                this.bgColor,
                this.unitLogo,
                false
            ));
            this.addElement(new Cardistry.TextBox(
                this,
                this.unitName,
                STYLES.fullBack.recolor(this.elementColor).scale(0.8).realign(H_ALIGN.center, V_ALIGN.bottom),
                0,
                this.getDrawableBoundRect().cutTopPct(0.75),
                this.bgColor
            ));
        } else {
            this.addElement(new Cardistry.TextBox(
                this,
                this.factionName,
                STYLES.fullBack.recolor(this.elementColor).scale(0.8).realign(H_ALIGN.center, V_ALIGN.top),
                0,
                this.getDrawableBoundRect().cutBottomPct(0.5),
                this.bgColor
            ));
            this.addElement(new Cardistry.TextBox(
                this,
                this.unitName,
                STYLES.fullBack.recolor(this.elementColor).scale(0.8).realign(H_ALIGN.center, V_ALIGN.bottom),
                0,
                this.getDrawableBoundRect().cutTopPct(0.5),
                this.bgColor
            ));
        }
    }
}

class RoadWarriorRuleCard extends Cardistry.Card {
    ruleName
    ruleText

    constructor(ruleName, ruleText) {
        super(CARD_HEIGHT, CARD_WIDTH, CARD_BLEED, CARD_SAFE, CARD_EXTRA, COLORS.white, DEFAULT_DPI);

        this.ruleName = ruleName;
        this.ruleText = ruleText;

        this.addElement(new Cardistry.TextBox(
            this,
            this.ruleName,
            STYLES.header.scale(0.55),
            0,
            this.getDrawableBoundRect().cutPct(0, 0, 0, 0.9),
            this.bgColor));
        this.addElement(new Cardistry.TextBox(
            this,
            this.ruleText,
            STYLES.body.scale(0.4),
            0,
            this.getDrawableBoundRect().cutPct(0, 0, 0.1, 0),
            this.bgColor));
    }
}

class RoadWarriorItemCard extends Cardistry.Card {
    title
    body
    hp
    dice
    slotsImage
    attackCostImages
    attackEffectText
    attackArcImage
    attackRange
    isWeakSpot
    keywords

    constructor(title, body, hp, dice, slots, attackCost, attackEffect, attackArc, attackRange, isWeakSpot, keywords) {
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
        this.isWeakSpot = isWeakSpot.toLowerCase() === 'y';
        this.keywords = someOrNone(keywords);

        // background
        if(this.isWeakSpot) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getFullBoundRect(),
                this.bgColor,
                im.get('item_bg_weak'),
                true,
                H_ALIGN.center,
                V_ALIGN.middle
            ));
        }
        // title
        this.addElement(new Cardistry.TextBox(
            this,
            this.title,
            STYLES.header.scale(0.60),
            0,
            this.getDrawableBoundRect().cutPct(0, 0.2, 0, 0.8),
            this.bgColor));
        if(this.keywords) {
            this.addElement(new Cardistry.TextBox(
                this,
                keywords,
                STYLES.header.scale(0.4).realign(H_ALIGN.left, V_ALIGN.bottom),
                0,
                this.getDrawableBoundRect().cutPct(0, 0, 0.15, 0.81),
                null
            ));
        }
        if(this.attackCostImages.length > 0) {
            let attackBoxRect = this.getDrawableBoundRect().cutPct(0, 0, 0.2, 0.125);
            let attackBoxBgColor = COLORS['gray'];
            this.addElement(new Cardistry.Box(this, attackBoxRect, attackBoxBgColor));
            attackBoxRect = attackBoxRect.shrink(20);
            addImagesRow(this, this.attackCostImages, attackBoxRect.cutPct(0, 0.66, 0, 0.8), attackBoxBgColor);
            if(this.attackArcImage) {
                this.addElement(new Cardistry.ImageBox(
                    this,
                    attackBoxRect.cutPct(0, 0.66, 0.2, 0.2),
                    attackBoxBgColor,
                    this.attackArcImage,
                    false
                ));
            }
            this.addElement(new Cardistry.TextBox(
                this,
                this.attackEffectText,
                STYLES.body.scale(0.5).realign('left', 'middle'),
                0,
                attackBoxRect.cutPct(0.33, 0, 0, 0).cutLeft(20),
                attackBoxBgColor,
                [
                    new KeywordHighlighter('Passenger', STYLES.bodyBold.scale(0.55).realign('left', 'middle')),
                    new KeywordHighlighter('Spin Out', STYLES.bodyBold.scale(0.55).realign('left', 'middle')),
                    ...GLYPHS,
                ]
            ));
            this.addElement(new Cardistry.TextBox(
                this,
                this.attackRange,
                STYLES.bodyBold.scale(0.5).realign('center', 'middle'),
                0,
                attackBoxRect.cutPct(0, 0.66, 0.8, 0),
                attackBoxBgColor,
                [new RangeGlyph()]
            ));
        } else {
            this.addElement(new Cardistry.TextBox(
                this,
                this.body,
                STYLES.body.scale(0.7).realign('left', 'middle'),
                0,
                this.getDrawableBoundRect().cutPct(0, 0, 0.2, 0.1),
                this.bgColor,
                [
                    new KeywordHighlighter('Passenger', STYLES.bodyBold.scale(0.7).realign('left', 'middle')),
                    new KeywordHighlighter('Spin Out', STYLES.bodyBold.scale(0.7).realign('left', 'middle')),
                    ...GLYPHS,
                ]
            ));
        }
        if(this.slotsImage) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutPct(0.8, 0, 0, 0.9),
                this.bgColor,
                this.slotsImage,
                false,
                'right',
                'top'
            ));
        }
        if(this.dice) {
            addImagesRow(
                this,
                this.dice.map((x) => im.getRecolored('die', COLORS[x])),
                this.getDrawableBoundRect().cutPct(0, 0.5, 0.9, 0),
                this.bgColor,
                false,
                'left',
                'middle'
            );
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
                STYLES.bodyBold.scale(0.7).realign('center', 'middle'),
                0,
                this.getDrawableBoundRect().cutPct(0.8, 0, 0.9, 0),
                null
            ));
        }
    }
}

class RoadWarriorAICard extends Cardistry.Card {
    faction
    vehicle
    vehicleIconImage
    title
    attackArcImage
    body
    chainImage

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
            STYLES.header.scale(0.65),
            0,
            this.getDrawableBoundRect().cutPct(0, 0.2, 0, 0.8),
            this.bgColor));
        this.addElement(new Cardistry.ImageBox(
            this,
            this.getDrawableBoundRect().cutPct(0, 0, 0.2, 0.55),
            this.bgColor,
            this.attackArcImage
        ));
        this.addElement(new Cardistry.TextBox(
            this,
            this.body,
            STYLES.body.scale(0.65).realign('left', 'middle'),
            0,
            this.getDrawableBoundRect().cutPct(0, 0, 0.45, 0),
            this.bgColor,
            [
                new KeywordHighlighter('Spin Out', STYLES.bodyBold.scale(0.65).realign('left', 'middle')),
                ...GLYPHS,
            ]
        ));
        if(this.chainImage) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutPct(0.8, 0, 0.9, 0),
                this.bgColor,
                this.chainImage,
                false,
                'right',
                'bottom'
            ));
        }
        if(this.vehicleIconImage) {
            this.addElement(new Cardistry.ImageBox(
                this,
                this.getDrawableBoundRect().cutPct(0.8, 0, 0, 0.9),
                this.bgColor,
                this.vehicleIconImage,
                false,
                'right',
                'top'
            ));
        }
    }
}

class RoadWarriorInitiativeCard extends Cardistry.Card {
    faction
    name
    specialRules
    vehicleIconImage
    hp
    color
    toughness
    quantity

    constructor(faction, name, specialRules, vehicleIcon, hp, color, toughness, quantity) {
        super(CARD_HEIGHT, CARD_WIDTH, CARD_BLEED, CARD_SAFE, CARD_EXTRA, DEFAULT_CARD_BG_COLOR, DEFAULT_DPI);

        this.faction = faction;
        this.name = name;
        this.specialRules = specialRules;
        this.vehicleIconImage = im.getRecolored(vehicleIcon, COLORS.white);
        this.hp = someOrNone(hp);
        this.color = someOrNone(color);
        this.toughness = someOrNone(toughness);
        this.quantity = someOrNone(quantity);

        this.addElement(new Cardistry.TextBox(
            this,
            this.faction,
            STYLES.bodyBold.scale(1.85).realign('right', 'top'),
            0,
            this.getDrawableBoundRect().cutPct(0, 0, 0, 0.66),
            this.bgColor));
        if(this.specialRules) {
            this.addElement(new Cardistry.TextBox(
                this,
                this.specialRules,
                STYLES.body.scale(0.8).realign('right', 'top'),
                0,
                this.getDrawableBoundRect().cutPct(0, 0, 0.25, 0.33),
                this.bgColor));
        }
        if(this.color) {
            this.addElement(new Cardistry.Box(
                this,
                this.getFullBoundRect().cutPct(0, 0, 0.55, 0),
                COLORS[this.color]
            ));
        }
        this.addElement(new Cardistry.TextBox(
            this,
            this.name,
            STYLES.bodyBold.scale(1.1).realign('right', 'bottom').recolor(COLORS.white),
            0,
            this.getDrawableBoundRect().cutPct(0.5, 0, 0.66 + 0.05, 0),
            COLORS[this.color]));
        // if(this.toughness) {
        //     this.addElement(new Cardistry.TextBox(
        //         this,
        //         this.toughness + '+',
        //         STYLES.bodyBold.scale(1.1).realign('center', 'middle'),
        //         0,
        //         this.getDrawableBoundRect().cutPct(0.85, 0, 0, 0.7),
        //         this.bgColor
        //     ));
        // }
        if(this.vehicleIconImage) {
            let images = [];
            for(let i = 0; i < this.quantity; i++) {
                images.push(this.vehicleIconImage);
            }
            addImagesRow(
                this,
                images,
                this.getDrawableBoundRect().cutPct(0, 0.5, 0.66, 0),
                COLORS[this.color],
                false,
                'left',
                'center'
            );
        }
        // if(this.quantity) {
        //     this.addElement(new Cardistry.TextBox(
        //         this,
        //         this.quantity + 'X',
        //         STYLES.bodyBold.scale(1.1).realign('center', 'middle'),
        //         0,
        //         this.getDrawableBoundRect().cutPct(0, 0.85, 0.7, 0),
        //         this.bgColor
        //     ));
        // }
        // if(this.hp) {
        //     this.addElement(new Cardistry.ImageBox(
        //         this,
        //         this.getDrawableBoundRect().cutPct(0.85, 0, 0.7, 0),
        //         this.bgColor,
        //         im.get('shield'),
        //         false
        //     ));
        //     this.addElement(new Cardistry.TextBox(
        //         this,
        //         '' + hp,
        //         STYLES.bodyBold.scale(1).realign('center', 'middle'),
        //         0,
        //         this.getDrawableBoundRect().cutPct(0.85, 0, 0.7, 0),
        //         null
        //     ));
        // }
    }
}

class RoadWarriorScenarioCard extends Cardistry.Card {
    factionText
    nameText
    playerPosX
    playerPosY
    enemies
    rewardText
    tierText

    constructor(faction, name, playerPos, enemies, rewards, tier) {
        super(CARD_HEIGHT * 2, CARD_WIDTH * 2, CARD_BLEED, CARD_SAFE, CARD_EXTRA, DEFAULT_CARD_BG_COLOR, DEFAULT_DPI);

        this.factionText = faction;
        this.nameText = name;
        this.playerPosY = playerPos.split(',')[0] - 1 - 3;
        this.playerPosX = 10 - playerPos.split(',')[1] - 1;
        this.enemies = enemies.trim().split('\n').map((value) => {
            const re = /([a-zA-Z_]+)\(([0-9]+),([0-9]+)\)/;
            const result = re.exec(value);
            let enemy = {
                tag: result[1],
                y: result[2] - 1 - 3,
                x: 10 - result[3] - 1
            };

            if(vehicles[enemy.tag]) {
                return enemy;
            } else {
                console.error("ERROR: Bad tag in scenario: " + enemy.tag);
            }
        });
        this.statsText = '';
        this.rewardText = rewards;
        this.tierText = tier;


        const mapRect = this.getDrawableBoundRect().cutPct(0, 0.3, 0, 0.15);
        const fudgeRect = mapRect.cutPct(0, 0, 0.115, 0.115);
        this.addElement(new Cardistry.Box(
            this,
            fudgeRect,
            COLORS.grey
        ));
        let h = fudgeRect.h / 9;
        let w = fudgeRect.w / 10;
        let vehiclesFound = {};
        for(let enemy of this.enemies) {
            let vehicle = vehicles[enemy.tag];
            let x = enemy.x * w + fudgeRect.x;
            let y = enemy.y * h + fudgeRect.y;
            this.addElement(new Cardistry.Box(
                this,
                new BoundaryRect(x, y, w, h),
                COLORS[vehicle['Color']]
            ));
            this.addElement(new Cardistry.ImageBox(
                this,
                new BoundaryRect(x, y, w, h).shrinkPct(0.1),
                null,
                im.getRecolored(vehicle['Vehicle Icon'], COLORS.white),
                false
            ));
            if(!vehiclesFound[vehicle['Name Text']]) {
                this.statsText += vehicle['Name Text'] + '\nHP: ' + vehicle['HP'] + ' | ' + vehicle['Tough.'] + '+\n\n';
                vehiclesFound[vehicle['Name Text']] = true;
            }
        }
        this.addElement(new Cardistry.ImageBox(
            this,
            new BoundaryRect(this.playerPosX * w + fudgeRect.x, this.playerPosY * h + fudgeRect.y, w, h).shrinkPct(0.1),
            null,
            im.get('special'),
            false
        ));
        this.addElement(new Cardistry.ImageBox(
            this,
            mapRect,
            null,
            im.get('grid'),
            false
        ));
        this.addElement(new Cardistry.TextBox(
            this,
            this.statsText,
            STYLES.body.scale(0.9).realign('right', 'top'),
            0,
            this.getDrawableBoundRect().cutPct(0.7, 0, 0, 0.5),
            this.bgColor
        ));
        this.addElement(new Cardistry.TextBox(
            this,
            this.factionText + '\n' + this.nameText,
            STYLES.header.realign('left', 'bottom'),
            0,
            this.getDrawableBoundRect().cutPct(0, 0, 0.9, 0),
            this.bgColor
        ));
        this.addElement(new Cardistry.TextBox(
            this,
            'Rewards:\n' + this.rewardText,
            STYLES.body.scale(0.9).realign('right', 'bottom'),
            0,
            this.getDrawableBoundRect().cutPct(0.7, 0, 0.5, 0),
            this.bgColor
        ));
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

/**
 *
 * @param {Sheet|Card} sheet
 * @param {string} path
 * @returns {Promise<void>}
 */
async function exportAndUpload(sheet, path) {
    sheet.exportPNG(path).then((path) => {
        return upload(ASSET_FOLDER_ID, path, auth);
    });
}

/**
 *
 * @param {Sheet} sheet
 * @param {string} path
 * @param {number} columns
 * @param {number} pct
 * @param {boolean} excludePrintableArea
 * @param {boolean} includeHashMarks
 * @returns {Promise<void>}
 */
async function exportScaledAndUpload(sheet, path, columns, pct, excludePrintableArea, includeHashMarks) {
    sheet.exportScaledPNG(path, columns, pct, excludePrintableArea, includeHashMarks).then((path) => {
        return upload(ASSET_FOLDER_ID, path, auth);
    });
}

/**
 *
 * @returns {Promise<void>}
 */
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

        // load all the backs
        im.loadImage('item_starter_back', 'assets/back_item_starter.png')
        im.loadImage('item_tier_1_back', 'assets/back_item_tier_1.png')
        im.loadImage('item_tier_2_back', 'assets/back_item_tier_2.png')
        im.loadImage('item_tier_3_back', 'assets/back_item_tier_3.png')
        im.loadImage('item_tier_4_back', 'assets/back_item_tier_4.png')

        // load all the dice
        const dice_response = await getSheetValues(SHEET_ID, 'Dice', auth);
        dice = rowsToObjects(dice_response.data.values);

        // load all the items
        const items_response = await getSheetValues(SHEET_ID, 'Items', auth);
        items = decksByFields(rowsToObjects(items_response.data.values), 'Tier');
        Object.values(items).forEach((deck) => {
            Object.values(deck).forEach((card) => {
                // check/repair data
                if(!card.Qty) {
                    card.Qty = 1;
                    console.error("ERROR: Bad quantity, setting to 1: " + card.Tag);
                }
            });
        });

        // load all the vehicles
        const vehicles_response = await getSheetValues(SHEET_ID, 'Vehicles', auth);
        vehicles = rowsToObjects(vehicles_response.data.values);

        // load all the ais
        const ais_response = await getSheetValues(SHEET_ID, 'Enemy AI', auth);
        ais = decksByFields(rowsToObjects(ais_response.data.values), 'Faction', 'Vehicle');

        // load all the tokens
        const tokens_response = await getSheetValues(SHEET_ID, 'Tokens', auth);
        tokens = rowsToObjects(tokens_response.data.values);

        // load all the scenarios
        const scenarios_response = await getSheetValues(SHEET_ID, 'Scenarios', auth);
        scenarios = decksByFields(rowsToObjects(scenarios_response.data.values), 'Tier');

        // load all the rules
        const rules_response = await getSheetValues(SHEET_ID, 'Rules', auth);
        rules = rowsToObjects(rules_response.data.values);
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
                    item['Attack Range'],
                    item['Weak Point'],
                    item['Keywords']);
                try {
                    card.draw();
                } catch(err) {
                    console.error("ERROR: couldn't draw: " + item['Name Text']);
                    throw err;
                }

                for(let i = 0; i < item['Qty']; i++) {
                    item_cards.push(card);
                }
            }
            let item_sheet = new Cardistry.Sheet(item_cards);
            exportScaledAndUpload(item_sheet, 'var/tts/item_' + convertToFilename(deckName) + '_fronts.png', 5, 1, true, false);
            let item_back = new RoadWarriorItemCardBack(im.get('item_' + convertToFilename(deckName) + '_back'));
            item_back.draw();
            exportAndUpload(item_back, 'var/tts/item_' + convertToFilename(deckName) + '_back.png')
        }

        // generate initiative cards
        let init_cards = [];
        for(let vehicle of Object.values(vehicles)) {
            let card = new RoadWarriorInitiativeCard(
                vehicle['Faction'],
                vehicle['Name Text'],
                vehicle['Special Rules'],
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
        exportScaledAndUpload(init_sheet, 'var/tts/initiative_fronts.png', 5, 1, true, false);
        init_sheet.exportScaledPNG('var/pnp/initiative_fronts.png', 5, 1, true, true);
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
                );
                card.draw();
                for (let i = 0; i < ai['Qty']; i++) {
                    ai_cards.push(card);
                }
            }
            while((ai_cards.length) > 0 && (ai_cards.length < 6)) {
                ai_cards.push(...ai_cards);
            }
            let ai_sheet = new Cardistry.Sheet(ai_cards);
            exportScaledAndUpload(ai_sheet, 'var/tts/ai_' + convertToFilename(deckName) + '_fronts.png', 5, 1, true, false);
            ai_sheet.exportScaledPNG('var/pnp/ai_' + convertToFilename(deckName) + '_fronts.png', 5, 1, true, true);
            let exemplar = Object.values(deck)[0];
            let ai_back = new RoadWarriorAICardBack(exemplar['Faction'], COLORS[exemplar['Back Color']], exemplar['Vehicle'], exemplar['Vehicle Icon']);
            ai_back.draw();
            exportAndUpload(ai_back, 'var/tts/ai_' + convertToFilename(deckName) + '_back.png');
        }

        // generate tokens
        for(let token of Object.values(tokens)) {
            let tokenImage = im.get(token['Icon']);
            const canvas = cvs.createCanvas(tokenImage.width, tokenImage.height);
            const ctx = canvas.getContext('2d');
            // ctx.fillStyle = '#' + COLORS.white;
            // ctx.fillRect(0, 0, tokenImage.width, tokenImage.height);
            ctx.drawImage(tokenImage, 0, 0);
            const out = fs.createWriteStream('var/tts/' + token['Tag'] + ".png");
            canvas.createPNGStream().pipe(out);
            upload(ASSET_FOLDER_ID, 'var/tts/' + token['Tag'] + ".png", auth);
        }

        // generate scenarios
        for(let deckName in scenarios) {
            let deck = scenarios[deckName];
            let scenario_cards = [];
            let scenario_card_backs = [];
            for(let scenario of Object.values(deck)) {
                let card = new RoadWarriorScenarioCard(
                    scenario['Faction'],
                    scenario['Name Text'],
                    scenario['Player Pos'],
                    scenario['Enemies'],
                    scenario['Rewards'],
                    scenario['Tier']
                );
                card.draw();
                scenario_cards.push(card);

                let scenario_back = new RoadWarriorCardBack(
                    deckName + ' Scenario\n' + scenario['Faction'],
                    null,
                    COLORS.dark_gray,
                    COLORS.white,
                    true
                );
                scenario_back.draw();
                scenario_card_backs.push(scenario_back);
            }
            while((scenario_cards.length) > 0 && (scenario_cards.length < 4)) {
                scenario_cards.push(...scenario_cards);
                scenario_card_backs.push(...scenario_card_backs);
            }
            let scenario_sheet = new Cardistry.Sheet(scenario_cards);
            exportScaledAndUpload(scenario_sheet, 'var/tts/scenario_' + convertToFilename(deckName) + '_fronts.png', 3, 1, true, false);
            scenario_sheet.exportScaledPNG('var/pnp/scenario_' + convertToFilename(deckName) + '_fronts.png', 3, 1, true, true);
            let scenario_back_sheet = new Cardistry.Sheet(scenario_card_backs);
            exportScaledAndUpload(scenario_back_sheet, 'var/tts/scenario_' + convertToFilename(deckName) + '_back.png', 3, 1, true, false);
            scenario_back_sheet.exportScaledPNG('var/pnp/scenario_' + convertToFilename(deckName) + '_back.png', 3, 1, true, true);
        }

        let rule_cards = [];
        for(let ruleTag in rules) {
            let rule = rules[ruleTag];
            let card = new RoadWarriorRuleCard(rule['Name'], rule['Rules']);
            card.draw();
            rule_cards.push(card);
        }
        let rule_sheet = new Cardistry.Sheet(rule_cards);
        exportScaledAndUpload(rule_sheet, 'var/tts/rule_fronts.png', 3, 1, true, false);
        rule_sheet.exportScaledPNG('var/pnp/rule_fronts.png', 3, 1, true, true);
        let rule_back = new RoadWarriorCardBack('Rule', im.get('book'), COLORS.pink, COLORS.black, true);
        rule_back.draw();
        exportAndUpload(rule_back, 'var/tts/rule_back.png');

        // export the card data for patcher and TTS to use
        const stats = {
            ais: ais,
            scenarios: scenarios,
            dice: dice,
            vehicles: vehicles,
            tokens: tokens,
            rules: rules,
            items: items
        };

        // patch the item dice values to be tags in TTS
        Object.values(stats.items).forEach((itemDeck) => {
            Object.values(itemDeck).forEach((item) => {
                item.Dice = item.Dice.split(',').map((v) => v.trim());
                if(item.Dice.length == 1 && item.Dice[0] == "") {
                    item.Dice = [];
                }
            });
        });

        // patch the scenario enemy vehicles to be tags in TTS
        Object.values(stats.scenarios).forEach((scenarioDeck) => {
            Object.values(scenarioDeck).forEach((scenario) => {
                scenario['Model Tags'] = []
                let uniqueTags = {};
                let uniqueAiTags = {};
                let allTags = scenario['Enemies'].split('\n').map((v) => v.trim()).filter((v) => v !== "");
                allTags.forEach((loc) => {
                    const re = /([a-zA-Z_]+)\(([0-9]+),([0-9]+)\)/;
                    const result = re.exec(loc);
                    let enemy = {
                        tag: result[1],
                        y: result[2] - 1 - 3,
                        x: 10 - result[3] - 1
                    };
                    let vehicle = stats.vehicles[enemy.tag];
                    let color = COLORS[vehicle.Color];
                    enemy.color = {
                        r: parseInt(color.substring(0, 2), 16) / 255.0,
                        g: parseInt(color.substring(2, 4), 16) / 255.0,
                        b: parseInt(color.substring(4, 6), 16) / 255.0
                    };
                    enemy.model = 'model_' + vehicle['Vehicle Icon'];
                    uniqueTags[enemy.tag] = true;
                    let aiTag = 'ai_' + convertToFilename(vehicle["Faction"] + ' ' + vehicle["Name Text"]);
                    uniqueAiTags[aiTag] = true;
                    scenario['Model Tags'].push(enemy)
                });

                // check for multi-square units
                Object.keys(uniqueTags).forEach((tag) => {
                    let size = parseInt(stats.vehicles[tag].Size);
                    if(size > 1) {
                        scenario['Model Tags'] = scenario['Model Tags'].reduce((acc, val) => {
                            if(val.tag === tag) {
                                if(acc.find((v) => v.tag === tag)) {
                                    // do nothing
                                } else {
                                    if(size == 2) {
                                        val.y += 0.5;
                                    } else if(size == 4) {
                                        val.x += 0.5;
                                        val.y += 0.5;
                                    } else {
                                        console.log("ERROR: Unknown vehicle size: " + size)
                                    }
                                    acc.push(val);
                                }
                            } else {
                                acc.push(val);
                            }
                            return acc;
                        }, []);
                    }
                });

                scenario['Initiative Tags'] = ['player', ...Object.keys(uniqueTags)];
                scenario['AI Tags'] = [...Object.keys(uniqueAiTags)];
                let playerPos = scenario['Player Pos'].split(',');
                scenario['Player Pos'] = {
                    y: parseInt(playerPos[0]) - 3,
                    x: 10 - parseInt(playerPos[1])
                };
            });
        });

        fs.writeFileSync('var/stats.json', JSON.stringify(stats, null, 2));
    });
}

main();
