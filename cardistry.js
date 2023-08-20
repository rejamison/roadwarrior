const cvs = require("canvas");
const fs = require("fs");
const rnd = require("./randomizer");
const {createCanvas, loadImage} = require("canvas");

const V_ALIGN = {
    top: 'top',
    bottom: 'bottom',
    middle: 'middle'
}
exports.V_ALIGN = V_ALIGN;

const H_ALIGN = {
    left: 'left',
    right: 'right',
    center: 'center'
}
exports.H_ALIGN = H_ALIGN;

/**
 * @class BoundaryRect
 */
class BoundaryRect {
    constructor(x, y, w, h) {
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.w = w;
        /** @type {number} */
        this.h = h;
    }

    rotate90() {
        return new BoundaryRect(this.x + (this.w / 2) - (this.h / 2), this.y + (this.h / 2) - (this.w / 2), this.h, this.w);
    }

    snap() {
        return new BoundaryRect(Math.round(this.x), Math.round(this.y), Math.round(this.w), Math.round(this.h));
    }

    scale(factor) {
        let mx = (this.w - (this.w * factor)) / 2;
        let my = (this.h - (this.h * factor)) / 2;
        return new BoundaryRect(this.x + mx, this.y + my, this.w * factor, this.h * factor);
    }

    nudge(x, y) {
        return new BoundaryRect(this.x + x, this.y + y, this.w - x, this.h - y);
    }

    move(x, y) {
        return new BoundaryRect(this.x + x, this.y + y, this.w, this.h);
    }

    clone() {
        return Object.assign({}, this);
    }

    shrink(margin) {
        return new BoundaryRect(this.x + margin, this.y + margin, this.w - margin * 2, this.h - margin * 2);
    }

    shrinkPct(pct) {
        return this.shrink(this.w * pct);
    }

    expand(margin) {
        return new BoundaryRect(this.x - margin, this.y - margin, this.w + margin * 2, this.h + margin * 2);
    }

    cutTop(h) {
        return new BoundaryRect(this.x, this.y + h, this.w, this.h - h);
    }

    cutTopPct(p) {
        let cut = this.h * p;
        return new BoundaryRect(this.x, this.y + cut, this.w, this.h - cut);
    }

    cutBottom(h) {
        return new BoundaryRect(this.x, this.y, this.w, this.h - h);
    }

    cutBottomPct(p) {
        let cut = this.h * p;
        return new BoundaryRect(this.x, this.y, this.w, this.h - cut);
    }

    cutLeft(w) {
        return new BoundaryRect(this.x + w, this.y, this.w - w, this.h);
    }

    cutLeftPct(p) {
        let cut = this.w * p;
        return new BoundaryRect(this.x - cut, this.y, this.w - cut, this.h);
    }

    cutRight(w) {
        return new BoundaryRect(this.x, this.y, this.w - w, this.h);
    }

    cutRightPct(p) {
        let cut = this.w * p;
        return new BoundaryRect(this.x, this.y, this.w - cut, this.h);
    }

    cut(l, r, t, b) {
        return new BoundaryRect(this.x + l, this.y + t, this.w - l - r, this.h - t - b);
    }

    cutPct(lp, rp, tp, bp) {
        let cutl = this.w * lp;
        let cutr = this.w * rp;
        let cutt = this.h * tp;
        let cutb = this.h * bp;
        return new BoundaryRect(this.x + cutl, this.y + cutt, this.w - cutl - cutr, this.h - cutt - cutb);
    }
}
exports.BoundaryRect = BoundaryRect;

/**
 * @class Font
 */
class TextStyle {
    /** @type {string} */
    font
    /** @type {number} */
    size
    /** @type {string} */
    color
    /** @type {string} */
    hAlign
    /** @type {string} */
    vAlign

    /**
     *
     * @param {string} font
     * @param {number} size
     * @param {string} color
     * @param {string} hAlign
     * @param {string} vAlign
     */
    constructor(font, sizePx, color, hAlign, vAlign) {
        this.font = font;
        this.size = sizePx;
        this.color = color;
        this.hAlign = hAlign;
        this.vAlign = vAlign;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    setCtx(ctx) {
        ctx.font = this.size + 'px ' + this.font;
        ctx.fillStyle = '#' + this.color;
    }

    /**
     *
     * @param {number} pct
     * @returns {TextStyle}
     */
    scale(pct) {
        return new TextStyle(this.font, this.size * pct, this.color, this.hAlign, this.vAlign);
    }

    /**
     *
     * @param {string} hAlign
     * @param {string} vAlign
     * @returns {TextStyle}
     */
    realign(hAlign, vAlign) {
        return new TextStyle(this.font, this.size, this.color, hAlign, vAlign);
    }

    /**
     *
     * @param {string} font
     * @returns {TextStyle}
     */
    refont(font) {
        return new TextStyle(font, this.size, this.color, this.hAlign, this.vAlign);
    }

    /**
     *
     * @param {string} color
     * @returns {TextStyle}
     */
    recolor(color) {
        return new TextStyle(this.font, this.size, color, this.hAlign, this.vAlign);
    }
}
exports.TextStyle = TextStyle;

class Card {
    /** @type {string} */
    bgColor

    constructor(width, height, bleed, safe, extra, bgColor, dpi) {
        /** @type {number} */
        this.height = height;
        /** @type {number} */
        this.width = width;
        /** @type {number} */
        this.bleed = bleed;
        /** @type {number} */
        this.safe = safe;
        /** @type {number} */
        this.extra = extra;
        /** @type {number} */
        this.margin = this.bleed + this.safe + this.extra;
        this.bgColor = bgColor;
        /** @type {number} */
        this.dpi = dpi;
        this.elements = [];

        this.hpx = this.getSizeInPx(this.height)
        this.wpx = this.getSizeInPx(this.width);
        this.mpx = this.getSizeInPx(this.margin);
        this.bpx = this.getSizeInPx(this.bleed);
        this.spx = this.getSizeInPx(this.safe);
        this.epx = this.getSizeInPx(this.extra);

        this.canvas = cvs.createCanvas(this.wpx, this.hpx);
        this.ctx = this.canvas.getContext('2d');

        // draw a background
        this.ctx.save();
        this.ctx.fillStyle = '#' + this.bgColor;
        this.ctx.fillRect(0, 0, this.wpx, this.hpx);
        this.ctx.restore();
    }

    addElement(element) {
        element.parent = this;
        this.elements.push(element);
    }

    draw() {
        this.elements.forEach(element => {
            element.draw();
        })
    }
    
    getSizeInPx(size) {
        return Math.round(size * this.dpi);
    }

    getDrawableBoundRect() {
        return new BoundaryRect(this.mpx, this.mpx, this.wpx - this.mpx * 2, this.hpx - this.mpx * 2);
    }

    getFullBoundRect() {
        return new BoundaryRect(0, 0, this.wpx, this.hpx);
    }

    generatePlayableCanvas() {
        const playable = cvs.createCanvas(this.wpx - this.bpx * 2, this.hpx - this.bpx * 2);
        const ctx = playable.getContext('2d');
        ctx.beginPath();
        ctx.roundRect(
            0,
            0,
            playable.width,
            playable.height,
            playable.width / 24
        );
        ctx.clip();
        ctx.drawImage(this.canvas, this.bpx, this.bpx, playable.width, playable.height, 0, 0, playable.width, playable.height);
        return playable;
    }

    exportPNG(file) {
        return new Promise(resolve => {
            const out = fs.createWriteStream(file);
            this.canvas.createPNGStream().pipe(out);
            out.on('finish', () => {
                console.log('exported card PNG: ' + file);
                resolve(file);
            });
        });
    }

    exportScaledPNG(file, pct, excludePrintableArea) {
        let sx = 0;
        let sy = 0;
        let sw = this.wpx;
        let sh = this.hpx;
        let dx = 0;
        let dy = 0;
        let dw = Math.round(sw * pct);
        let dh = Math.round(sh * pct);

        if(excludePrintableArea) {
            sx += this.bpx;
            sy += this.bpx;
            sw -= this.bpx * 2;
            sh -= this.bpx * 2;
        }

        const scaled = cvs.createCanvas(dw, dh);
        const scaledCtx = scaled.getContext('2d');
        scaledCtx.drawImage(this.canvas, sx, sy, sw, sh, dx, dy, dw, dh);

        const out = fs.createWriteStream(file);
        scaled.createPNGStream().pipe(out);
        out.on('finish', () => { console.log('exported scaled card PNG: ' + file) });
    }
}
exports.Card = Card;

class CardElement {
    /** @type {Card} */
    parent
    /** @type {BoundaryRect} */
    boundRect

    /**
     *
     * @param {Card} parent
     * @param {BoundaryRect} boundRect
     */
    constructor(parent, boundRect) {
        this.parent = parent;
        if(!boundRect) {
            this.boundRect = this.parent.getDrawableBoundRect();
        } else {
            this.boundRect = boundRect;
        }
    }

    draw() { }
}
exports.CardElement = CardElement;

class Box extends CardElement {
    constructor(parent, boundRect, color) {
        super(parent, boundRect);

        this.color = color;
        this.ctx = this.parent.ctx;
    }

    draw() {
        this.ctx.save();

        this.ctx.fillStyle = '#' + this.color;
        this.ctx.fillRect(this.boundRect.x, this.boundRect.y, this.boundRect.w, this.boundRect.h);

        this.ctx.restore();
    }
}
exports.Box = Box;

class ImageBox extends Box {
    image
    stretch
    hAlign
    vAlign

    constructor(parent, boundRect, bgColor, image, stretch, hAlign, vAlign) {
        super(parent, boundRect, bgColor);

        this.image = image;
        this.stretch = stretch;
        this.hAlign = hAlign;
        this.vAlign = vAlign;
    }

    draw() {
        this.ctx.save();

        if(this.color) {
            this.ctx.fillStyle = '#' + this.color;
            this.ctx.fillRect(this.boundRect.x, this.boundRect.y, this.boundRect.w, this.boundRect.h);
        }
        if(this.stretch) {
            this.ctx.drawImage(this.image, this.boundRect.x, this.boundRect.y, this.boundRect.w, this.boundRect.h);
        } else {
            let factor = this.boundRect.w / this.image.width;  // start with width
            if(this.image.height * factor > this.boundRect.h) {  // check if the height fits with this scale factor
                factor = this.boundRect.h / this.image.height;  // if not, use the height scale factor instead
            }
            let w = this.image.width * factor;
            let h = this.image.height * factor;
            let x, y;
            if(this.hAlign === H_ALIGN.left) {
                x = this.boundRect.x;
            } else if(this.hAlign === H_ALIGN.right) {
                x = this.boundRect.x + (this.boundRect.w - w);
            } else {
                x = this.boundRect.x + ((this.boundRect.w - w) / 2)
            }
            if(this.vAlign === V_ALIGN.top) {
                y = this.boundRect.y;
            } else if(this.vAlign === V_ALIGN.bottom) {
                y = this.boundRect.y + (this.boundRect.h - h);
            } else {
               y = this.boundRect.y + ((this.boundRect.h - h) / 2);
            }

            this.ctx.drawImage(this.image, x, y, w, h);
        }

        this.ctx.restore();
    }
}
exports.ImageBox = ImageBox;

class TextBox extends CardElement {
    text
    /** @type {TextStyle} */
    margin
    /** @type {BoundaryRect} */
    bgColor
    /** @type {Array<Mutator>} [mutators] */
    mutators

    constructor(parent, text, style, margin, boundRect, bgColor, mutators) {
        super(parent, boundRect);

        this.text = text;
        this.margin = margin;
        this.style = style;
        this.marginPx = parent.getSizeInPx(this.margin);
        this.ctx = parent.ctx;
        this.mutators = mutators ? mutators : [];
        this.bgColor = bgColor;

        this.ctx.save();

        this.style.setCtx(this.ctx);
        this.ctx.textAlign = 'left';  // xover-ridding so we can manage internally
        this.ctx.textBaseline = 'alphabetic';  // over-ridding so we can manage internally
        this.fontHeight = this.ctx.measureText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz').actualBoundingBoxAscent;
        this.spaceSize = this.ctx.measureText(' ').width * 0.6;

        // generate chunks of text
        this.blocks = this.text.split('\n');
        this.lineSpacePx = this.fontHeight * 0.9;
        this.lines = [];
        let idx = 0;

        this.blocks.forEach(block => {
            this.lines.push({
                chunks: [],
                width: 0
            });

            this.chunks = [];
            this.words = block.split(' ');
            this.words.forEach(word => {
                const m = this.mutators.reduce((acc, m) => m.test(word) ? m : acc, new Mutator());
                const mm = m.measure(word, this.style, this.ctx);
                let chunk = {
                    word: word,
                    width: mm.w,
                    height: mm.h,
                    mutator: m
                };
                this.chunks.push(chunk);
            });
            this.chunks.forEach(chunk => {
                if(this.lines[idx].chunks.length === 0) {
                    this.lines[idx].chunks.push(chunk);
                    this.lines[idx].width += chunk.width;
                } else {
                    if(this.lines[idx].width + chunk.width + this.spaceSize > this.boundRect.w) {
                        this.lines.push({
                            chunks: [],
                            width: 0
                        });
                        idx++;
                    } else {
                        this.lines[idx].width += this.spaceSize;
                    }

                    this.lines[idx].chunks.push(chunk);
                    this.lines[idx].width += chunk.width;
                }
            });

            idx++;
        });

        this.wpx = this.lines.reduce((longest, current) => longest.width > current.width ? longest : current).width;
        this.wpx += this.marginPx * 2;
        this.hpx = (this.lines.length * this.fontHeight) + ((this.lines.length - 1) * this.lineSpacePx);
        this.hpx += this.marginPx * 2;

        this.ctx.restore();
    }

    draw() {
        this.ctx.save();
        if(this.bgColor) {
            this.ctx.fillStyle = '#' + this.bgColor;
            const b = this.getTextBoundRect();
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
        }

        this.style.setCtx(this.ctx);
        this.ctx.textAlign = 'left';  // over-ridding so we can manage internally
        this.ctx.textBaseline = 'alphabetic';  // over-ridding so we can manage internally

        // draw the text
        this.ctx.fillStyle = '#' + this.color;
        let x, y;
        if(this.style.vAlign === V_ALIGN.middle) {
            y = this.boundRect.y + (this.boundRect.h / 2) - (this.hpx / 2) + this.marginPx;
        } else if(this.style.vAlign === V_ALIGN.top) {
            y = this.boundRect.y + this.marginPx;
        } else if(this.style.vAlign === V_ALIGN.bottom) {
            y = this.boundRect.y + this.boundRect.h - this.hpx + this.marginPx;
        } else {
            console.log("WARNING: UNRECOGNIZED V-ALIGN VALUE: " + this.style.vAlign);
            y = this.boundRect.y + this.marginPx;
        }
        this.lines.forEach(line => {
            if(this.style.hAlign === H_ALIGN.left) {
                x = this.boundRect.x + this.marginPx;
            } else if(this.style.hAlign === H_ALIGN.right) {
                x = this.boundRect.x + this.boundRect.w - this.marginPx - line.width;
            } else if(this.style.hAlign === H_ALIGN.center) {
                x = this.boundRect.x + (this.boundRect.w / 2) - (line.width / 2);
            } else {
                console.log("WARNING: UNRECOGNIZED ALIGN VALUE: " + this.style.hAlign);
                x = this.boundRect.x + this.marginPx;
            }
            line.chunks.forEach(chunk => {
                chunk.mutator.mutate(chunk.word, this.style, this.ctx, new BoundaryRect(x, y, chunk.width, chunk.height));

                x += chunk.width + this.spaceSize;
            });
            y += this.fontHeight + this.lineSpacePx;
        });

        this.ctx.restore();
    }

    getTextBoundRect() {
        let x, y;
        if(this.style.hAlign === H_ALIGN.center) {
            x = this.boundRect.x + this.boundRect.w / 2 - this.wpx / 2;
        } else if(this.style.hAlign === H_ALIGN.right) {
            x = this.boundRect.x + this.boundRect.w - this.wpx;
        } else {
            x = this.boundRect.x;
        }
        if(this.style.vAlign === V_ALIGN.middle) {
            y = this.boundRect.y + this.boundRect.h / 2 - this.hpx / 2;
        } else if(this.style.vAlign === V_ALIGN.top || this.style.vAlign === 'hanging') {
            y = this.boundRect.y;
        } else {
            y = this.boundRect.y + this.boundRect.h - this.hpx;
        }

        return new BoundaryRect(x, y, this.wpx, this.hpx);
    }
}
exports.TextBox = TextBox;

class RotatedTextBox extends TextBox {
    constructor(parent, style, margin, boundRect, bgColor, rotation) {
        super(parent, style, margin, boundRect, bgColor);

        this.rotation = rotation;
    }

    draw() {
        this.ctx.save();

        let ox = this.boundRect.x + this.boundRect.w / 2;
        let oy = this.boundRect.y + this.boundRect.h / 2;
        this.ctx.translate(ox, oy);
        this.ctx.rotate(this.rotation);
        this.ctx.translate(-ox, -oy);

        super.draw();

        this.ctx.restore();
    }
}
exports.RotatedTextBox = RotatedTextBox;

class Mutator {
    constructor() {

    }

    /**
     *
     * @param str
     * @returns {boolean}
     */
    test(str) {
        return true;
    }

    /**
     *
     * @param {string} str
     * @param {TextStyle} style
     * @param {CanvasRenderingContext2D} ctx
     * @returns {{w: number, h: number}}
     */
    measure(str, style, ctx) {
        ctx.save();
        style.setCtx(ctx);
        let m = ctx.measureText(str);
        ctx.restore();
        return {
            w: m.width,
            h: m.actualBoundingBoxAscent
        };
    }

    /**
     *
     * @param str
     * @param {TextStyle} style
     * @param {CanvasRenderingContext2D} ctx
     * @param {BoundaryRect} boundRect
     */
    mutate(str, style, ctx, boundRect) {
        ctx.save();
        ctx.fillText(str, boundRect.x, boundRect.y + style.size, boundRect.w);
        ctx.restore();
    }
}
exports.Mutator = Mutator;

class WordHighlighter extends Mutator {
    /** @type {TextStyle} */
    style
    /** @type {Array<string>} */
    wordsToHighlight

    /**
     *
     * @param {Array<string>} wordsToHighlight
     * @param {TextStyle} style
     */
    constructor(wordsToHighlight, style) {
        super();

        this.wordsToHighlight = wordsToHighlight;
        this.style = style;
    }

    test(str) {
        return this.wordsToHighlight.includes(str);
    }

    measure(str, style, ctx) {
        ctx.save();
        this.style.setCtx(ctx);
        let m = ctx.measureText(str);
        ctx.restore();
        return {
            w: m.width,
            h: m.actualBoundingBoxAscent
        };
    }

    /**
     *
     * @param {string} str
     * @param {CanvasRenderingContext2D} ctx
     * @param {BoundaryRect} boundRect
     */
    mutate(str, style, ctx, boundRect) {
        ctx.save();
        this.style.setCtx(ctx);
        ctx.fillText(str, boundRect.x, boundRect.y + style.size, boundRect.w);
        ctx.restore();
    }
}
exports.WordHighlighter = WordHighlighter;

class GridCard extends Card {
    constructor(width, height, bleed, safe, extra, bgColor, dpi, cellSize, cellMargin, cellPalette) {
        super(width, height, bleed, safe, extra, bgColor, dpi);

        this.cellSize = cellSize;
        this.cellMargin = cellMargin;
        this.cellPalette = cellPalette;

        this.cspx = this.getSizeInPx(this.cellSize);
        this.cmpx = this.getSizeInPx(this.cellMargin);
        this.cwpx = this.cspx + this.cmpx;

        // calculate the grid sizes
        this.dwpx = this.wpx - this.mpx * 2;
        this.dhpx = this.hpx - this.mpx * 2;
        this.gwpx = this.dwpx - (this.dwpx % this.cwpx);
        this.gwpx = (this.dwpx - this.gwpx - this.cspx) > this.cspx ? this.gwpx + this.cspx : this.gwpx - this.cmpx;  // check if there's enough room to sneak in another pip
        this.ghpx = this.dhpx - (this.dhpx % this.cwpx);
        this.ghpx = (this.dhpx - this.ghpx - this.cmpx) > this.cspx ? this.ghpx + this.cspx : this.ghpx - this.cmpx;  // check if there's enough room to sneak in another pip
        this.cheatX = Math.round((this.dwpx - this.gwpx) / 2);
        this.cheatY = Math.round((this.dhpx - this.ghpx) / 2);

        // draw a random grid of pips
        this.drawRandomBGGrid();
    }

    drawRandomBGGrid() {
        this.ctx.save();

        for(let x = this.cheatX + this.mpx; x < this.mpx + this.dwpx - this.cspx; x += this.cwpx) {
            for(let y = this.cheatY + this.mpx; y < this.mpx + this.dhpx - this.cspx; y += this.cwpx) {
                if(rnd.random() < 0.4) {
                    let roll = rnd.random();
                    if(roll < 0.79) {
                        this.ctx.fillStyle = '#' + this.cellPalette[0];
                    } else if(roll < 0.91) {
                        this.ctx.fillStyle = '#' + this.cellPalette[1];
                    } else if(roll < 0.97) {
                        this.ctx.fillStyle = '#' + this.cellPalette[2];
                    } else {
                        this.ctx.fillStyle = '#' + this.cellPalette[3];
                    }

                    // pip
                    this.ctx.beginPath();
                    this.ctx.arc(x + this.cspx / 2, y + this.cspx / 2, this.cspx / 2, 0, Math.PI * 2, false);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }
        }

        this.ctx.restore();
    }

    deletePips(bounds) {
        this.ctx.save();

        // clone the boundary so we can manipulate a local version
        const b = bounds.clone();
        b.x = Math.round(b.x);
        b.y = Math.round(b.y);
        b.w = Math.round(b.w);
        b.h = Math.round(b.h);

        // find a position and height/width that completely cover dots
        let lSpill = (b.x - this.mpx - this.cheatX) % this.cwpx;
        b.x -= lSpill;
        b.w += lSpill;
        let rSpill = ((b.w) % this.cwpx);
        b.w += rSpill === 0 ? 0 : this.cwpx - rSpill;
        let tSpill = (b.y - this.mpx - this.cheatY) % this.cwpx;
        b.y -= tSpill;
        b.h += tSpill;
        let bSpill = ((b.h) % this.cwpx);
        b.h += bSpill === 0 ? 0 : this.cwpx - bSpill;

        // draw the box
        this.ctx.fillStyle = '#' + this.bgColor;

        // just a rectangle
        // ctx.fillRect(offset_x + b.x, offset_y + b.y, b.w - 1, b.h - 1); // -1 to account for aliasing

        // cut corners for a more rounded effect
        this.ctx.fillRect(b.x + this.cwpx, b.y, b.w - this.cwpx * 2 - 1, b.h - 1); // -1 to account for aliasing
        this.ctx.fillRect(b.x, b.y + this.cwpx, b.w - 1, b.h - this.cwpx * 2 - 1); // -1 to account for aliasing

        // draw the calculated background for debug
        // this.ctx.strokeStyle = 'green';
        // this.ctx.strokeRect(b.x, b.y, b.w, b.h);
        // this.ctx.strokeStyle = 'blue';
        // this.ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

        this.ctx.restore();
    }
}
exports.GridCard = GridCard;

class DieFace extends Card {
    constructor(width, height, bleed, safe, extra, bgColor, dpi, icons) {
        super(width, height, bleed, safe, extra, bgColor, dpi);

        this.icons = icons;

        if(this.icons.length === 1) {
            this.addElement(new ImageBox(this, this.getDrawableBoundRect(), this.bgColor, icons[0]));
        } else if(this.icons.length === 2) {
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0, 0.5, 0, 0.5), this.bgColor, icons[0]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0.5, 0, 0.5, 0), this.bgColor, icons[1]));
        } else if(this.icons.length === 3) {
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0, 0.5, 0, 0.5), this.bgColor, icons[0]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0.5, 0, 0, 0.5), this.bgColor, icons[1]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0.25, 0.25, 0.5, 0), this.bgColor, icons[2]));
        } else if(this.icons.length === 4) {
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0, 0.5, 0, 0.5), this.bgColor, icons[0]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0.5, 0, 0, 0.5), this.bgColor, icons[1]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0, 0.5, 0.5, 0), this.bgColor, icons[2]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0.5, 0, 0.5, 0), this.bgColor, icons[3]));
        } else if(this.icons.length === 5) {
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0, 0.66, 0, 0.66), this.bgColor, icons[0]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0.66, 0, 0, 0.66), this.bgColor, icons[1]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0, 0.66, 0.66, 0), this.bgColor, icons[2]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0.66, 0, 0.66, 0), this.bgColor, icons[3]));
            this.addElement(new ImageBox(this, this.getDrawableBoundRect().cutPct(0.33, 0.33, 0.33, 0.33), this.bgColor, icons[4]));
        } else {
            // do nothing
        }
    }
}
exports.DieFace = DieFace;

class Sheet {
    constructor(cards) {
        this.cards = cards;
    }

    exportPNG(file, columns) {
        if(this.cards && this.cards.length > 0) {
            const rows = Math.ceil(this.cards.length / columns);
            const cardWpx = this.cards[0].wpx;
            const cardHpx = this.cards[0].hpx;

            const sheetCanvas = cvs.createCanvas(cardWpx * columns, cardHpx * rows);
            const ctx = sheetCanvas.getContext('2d');

            let i = 0;
            this.cards.forEach(card => {
                const c = (i % columns);
                const r = Math.floor(i / columns);

                ctx.drawImage(card.canvas, c * cardWpx, r * cardHpx);
                i++;
            });

            return new Promise(resolve => {
                const out = fs.createWriteStream(file);
                sheetCanvas.createPNGStream().pipe(out);
                out.on('finish', () => {
                    console.log('exported sheet PNG: ' + file);
                    resolve(file);
                });
            });
        }
    }

    exportScaledPNG(file, columns, pct, excludePrintableArea, includeHashMarks) {
        if(this.cards && this.cards.length > 0) {
            const rows = Math.ceil(this.cards.length / columns);
            const cardWpx = this.cards[0].wpx;
            const cardHpx = this.cards[0].hpx;
            const bleedPx = this.cards[0].bpx;
            let sx = 0;
            let sy = 0;
            let sw = this.cards[0].wpx;
            let sh = this.cards[0].hpx;
            let dw = Math.round(cardWpx * pct);
            let dh = Math.round(cardHpx * pct);

            if(excludePrintableArea) {
                sx += bleedPx;
                sy += bleedPx;
                sw -= bleedPx * 2;
                sh -= bleedPx * 2;
            }

            const sheetCanvas = cvs.createCanvas(dw * columns, dh * rows);
            const ctx = sheetCanvas.getContext('2d');

            let i = 0;
            this.cards.forEach(card => {
                const c = (i % columns);
                const r = Math.floor(i / columns);

                ctx.drawImage(card.canvas, sx, sy, sw, sh, c * dw, r * dh, dw, dh);

                if(includeHashMarks) {
                    ctx.strokeStyle = "#888888";
                    ctx.strokeRect(c * dw, r * dh, dw, dh);
                }

                i++;
            });

            if(includeHashMarks) {
                let margin = 75;
                const printableCanvas = cvs.createCanvas(dw * columns + margin + margin, dh * rows + margin + margin);
                const pctx = printableCanvas.getContext('2d');
                pctx.strokeStyle = "#888888";
                for(let x = 0; x < columns + 1; x++) {
                    pctx.strokeRect(x * dw + margin - 1, 0, 2, printableCanvas.height);
                }
                for(let y = 0; y < rows + 1; y++) {
                    pctx.strokeRect(0, y * dh + margin - 1, printableCanvas.width, 2);
                }

                pctx.drawImage(sheetCanvas, margin, margin);

            }

            return new Promise(resolve => {
                const out = fs.createWriteStream(file);
                sheetCanvas.createPNGStream().pipe(out);
                out.on('finish', () => {
                    console.log('exported sheet PNG: ' + file);
                    resolve(file);
                });
            });
        }
    }
}
exports.Sheet = Sheet;

class Showcase extends Sheet {
    constructor(cards, widthPx, marginPx, bgColor) {
        super(cards);
        this.bgColor = bgColor;
        this.widthPx = widthPx;
        this.marginPx = marginPx;

        // figure out the scale needed to fit all the cards
        const card_wpx = this.cards[0].wpx - this.cards[0].bpx * 2;
        const card_hpx = this.cards[0].hpx - this.cards[0].bpx * 2;
        const px_for_card = widthPx - (marginPx * 2) - ((cards.length - 1) * marginPx);
        this.scaleFactor = (px_for_card / cards.length) / card_wpx;

        this.heightPx = (card_hpx * this.scaleFactor) + (this.marginPx * 2);
    }

    exportPNG(file) {
        const canvas = cvs.createCanvas(this.widthPx, this.heightPx);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#' + this.bgColor;
        ctx.fillRect(0, 0, this.widthPx, this.heightPx);

        let i = 0;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.shadowColor = '#444444';
        ctx.shadowBlur = 10;
        this.cards.forEach(card => {
            const playable = card.generatePlayableCanvas();
            // add a bit of jiggle to make them feel more natural
            ctx.save();
            ctx.translate(this.marginPx + (playable.width * this.scaleFactor + this.marginPx) * i + playable.width / 2, this.marginPx + playable.height / 2);
            ctx.rotate(rnd.random() * (Math.PI / 256 - Math.PI / 128));

            ctx.drawImage(playable,
                0, 0, playable.width, playable.height,
                -playable.width / 2, -playable.height / 2, playable.width * this.scaleFactor, playable.height * this.scaleFactor);
            i++;

            ctx.restore();
        });

        return new Promise(resolve => {
            const out = fs.createWriteStream(file);
            canvas.createPNGStream().pipe(out);
            out.on('finish', () => {
                console.log('exported showcase PNG: ' + file);
                resolve(file);
            });
        });
    }
}
exports.Showcase = Showcase;

class ImageManager {
    images
    promises

    constructor() {
        this.images = new Map();
        this.promises = [];
    }

    loadImage(key, file) {
        if(key && file) {
            let that = this;
            this.promises.push(new Promise(function(resolve) {
                console.log("Registering image: " + key + "|" + file);
                loadImage(file).then((img) => {
                    that.images.set(key, img);
                    resolve();
                }).catch(err => {
                    console.error('Failed to load image: ' + key + "|" + file);
                    console.error(err);
                });
            }));
        }
    }

    get(key) {
        return this.images.get(key);
    }

    getRecolored(key, color) {
        let img = this.get(key);
        if(img) {
            const canvas = cvs.createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = '#' + color;
            ctx.fillRect(0, 0, img.width, img.height);
            return canvas;
        } else {
            console.error("Couldn't load image with key: " + key);
        }
    }

    getInverted(key, colorIfDark, colorIfLight, bgColor) {
        let img = this.get(key);
        if(img) {
            if(isDark(bgColor)) {
                return this.getRecolored(key, colorIfDark);
            } else {
                return this.getRecolored(key, colorIfLight);
            }
        }
    }

    ready(onReady) {
        Promise.all(this.promises).then(onReady);
    }
}
exports.ImageManager = ImageManager;

function isDark(color) {
    return color && (((parseInt(color.slice(0,2), 16) + parseInt(color.slice(2,4), 16) + parseInt(color.slice(4,6), 16)) / 3) < 128);
}
exports.isDark = isDark;