const cvs = require("canvas");
const fs = require("fs");
const rnd = require("./randomizer.js");
const Cardistry = require('./cardistry.js');
const {Card, BoundaryRect, GridCard, RotatedTextBox, TextBox} = require("./cardistry");
const {loadImage} = require("canvas");

// setup the randomizer
rnd.seed(Date.now().toString());
// rnd.seed('1673045739034');
console.log('initializing with seed ' + rnd.getSeedString());

// register fonts
cvs.registerFont('lib/rokkitt/static/Rokkitt-Bold.ttf', {family: 'Rokkitt Bold'});
cvs.registerFont('lib/rokkitt/static/Rokkitt-Light.ttf', {family: 'Rokkitt Light'});

// load images
const attack_img = loadImage('assets/noun-fight-1279715.png');

const card_bleed = 0.125;
const card_safe = 0.125;
const card_height = 2.48 + card_bleed * 2;
const card_width = 1.61 + card_bleed * 2;
const card_extra = 0.05;
const text_size = (card_height - 0.6) / 10.5;
const text_margin = text_size * 0.23;

class RoadWarriorItemCard extends Cardistry.Card {
    constructor(dpi, bgColor, text, img) {
        super(card_width, card_height, card_bleed, card_safe, card_extra, bgColor, dpi);

        this.img = img;

        this.addElement(new Cardistry.ImageBox(
            this,
            this.getDrawableBoundRect().cutBottom(this.getDrawableBoundRect().h / 2),
            'FFFFFF',
            this.img,
            false
        ));
        this.addElement(new Cardistry.TextBox(
            this,
            text,
            'Rokkitt Bold',
            '000000',
            text_size,
            0,
            'left',
            'middle',
            this.getDrawableBoundRect().cutTop(this.getDrawableBoundRect().h / 2),
            this.bgColor
        ));
    }
}


attack_img.then((img) => {
    let card = new RoadWarriorItemCard(300, 'FFFFFF', "test", img);
    card.draw();
    card.exportPNG('test.png');
});

