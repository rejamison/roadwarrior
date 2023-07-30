const cvs = require("canvas");
const fs = require("fs");
const rnd = require("./randomizer.js");
const Cardistry = require('./cardistry.js');
const {Card, BoundaryRect, GridCard, RotatedTextBox, TextBox, ImageManager} = require("./cardistry");
const {loadImage} = require("canvas");

// setup the randomizer
rnd.seed(Date.now().toString());
// rnd.seed('1673045739034');
console.log('initializing with seed ' + rnd.getSeedString());

// register fonts
cvs.registerFont('lib/rokkitt/static/Rokkitt-Bold.ttf', {family: 'Rokkitt Bold'});
cvs.registerFont('lib/rokkitt/static/Rokkitt-Light.ttf', {family: 'Rokkitt Light'});

// load images
const im = new ImageManager();
im.loadImage('attack', 'assets/noun-fight-1279715.png');
im.loadImage('fire', 'assets/noun-fire-4798412.png');
im.loadImage('shield', 'assets/noun-shield-3000252.png');
im.loadImage('black-die', 'assets/noun-cube-5842799-000000.png');
im.loadImage('green-die', 'assets/noun-cube-5842799-71D358.png');
im.loadImage('blue-die', 'assets/noun-cube-5842799-00449F.png');
im.loadImage('purple-die', 'assets/noun-cube-5842799-C462DD.png');
im.loadImage('gray-die', 'assets/noun-cube-5842799-D3D3D3.png');
im.loadImage('red-die', 'assets/noun-cube-5842799-FF001C.png');
im.loadImage('orange-die', 'assets/noun-cube-5842799-FF824A.png');
im.loadImage('yellow-die', 'assets/noun-cube-5842799-FFD65B.png');

const card_bleed = 0.125;
const card_safe = 0.125;
const card_height = 2.48 + card_bleed * 2;
const card_width = 1.61 + card_bleed * 2;
const card_extra = 0.05;
const text_size = (card_height - 0.6) / 10.5;
const text_margin = text_size * 0.23;
const d6_width = 0.5;
const d6_height = 0.5;

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

class RoadWarriorDie extends Cardistry.Sheet {
    constructor(faces) {
        let cards = [];
        for(const face of faces) {
            let die = new Cardistry.DieFace(d6_width, d6_height, 0, 0, 0, 'FFD65B', 300, face);
            die.draw();
            cards.push(die);
        }

        super(cards);
    }
}


im.ready(() => {
    let card = new RoadWarriorItemCard(300, 'FFFFFF', "test", im.get('shield'));
    card.draw();
    card.exportPNG('test.png');

    let purple_d6 = new RoadWarriorDie([
        [im.get('shield')],
        [im.get('shield')],
        [im.get('shield'), im.get('shield'), im.get('shield'), im.get('shield'), im.get('shield')],
        [im.get('shield'), im.get('shield'), im.get('shield'), im.get('shield')],
        [im.get('shield'), im.get('shield'), im.get('shield')],
        [im.get('attack'), im.get('shield')]
    ]);
    purple_d6.exportPNG('test2.png', 3);
});
