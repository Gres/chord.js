CELL_WIDTH = 10
CELL_HEIGHT = 10
NUT_SIZE = CELL_HEIGHT / 2.0
LINE_WIDTH = 1
HALF_LINE_WIDTH = LINE_WIDTH / 2.0
DOT_RADIUS = Math.floor(0.45*CELL_WIDTH)
NUT_SIZE = 3
DOT_WIDTH = 2*DOT_RADIUS
X = CELL_WIDTH*2
Y = CELL_HEIGHT*2
MUTED = -1
WIDTH = 8 * CELL_WIDTH
HEIGHT = 8 * CELL_HEIGHT
NAME_FONT_SIZE = 18;
FONT = 'Arial';

function Chord(canvas, name, positions, fingering) {
	this.init(canvas, name, positions, fingering)
}

//Matches a named chord with optional fingerings
//              |Small      |Large chord with seperators            |        |Optional|
//              |Chord      |dashes, dots or spaces                 |        |Fingerings
Chord.regex = /([0-9xX]{4,6}|(?:x|X|\d\d?)(?:[-\. ](?:x|\d\d?)){3,5})\b(\s*\[([T\d]+)\])?/g

Chord.prototype = {
	init : function(name, positions, fingers, scale) {
		this.parse(positions, fingers)
		this.name = name
		this.renderer = this.canvasRenderer;
	},
	
	parse : function(frets, fingers) {
		this.positions = []
		var raw = [];
		if (frets.match(/^[0-9xX]{1,6}$/)) {
			for (var i = 0; i < frets.length;i++) {
				raw.push(frets.charAt(i))
			}
		} else {
			raw = frets.split(/[^\dxX]/)
		}
		this.stringCount = raw.length;
		this.boxWidth = (this.stringCount-1)*CELL_WIDTH;
		if (this.stringCount == 4) {
			this.fretCount = 4;
		} else {
			this.fretCount = 5;
		}
		var maxFret = 0 
		var minFret = 1000
		for (var i in raw) {
			var c = raw[i]
			if (c.toLowerCase() == 'x') {
				this.positions.push(MUTED)
			} else {
				var fret = parseInt(c)
				if (fret > 0 && fret < minFret) {
					minFret = fret
				}
				maxFret = Math.max(maxFret, fret)
				this.positions.push(fret)
			}
		}
		if (maxFret <=this.fretCount) {
			this.startFret = 1
		} else {
			this.startFret = minFret
		}
		this.fingerings = []
		if (!fingers) {
			return
		}
		var j = 0
		for (var i = 0; i < fingers.length; i++) {
			for (;j<this.positions.length;j++) {
				if (this.positions[j] <= 0) {
					this.fingerings.push(null)
				} else {
					this.fingerings.push(fingers[i])
					j++
					break
				}
			}
		}
	},
	
	drawMutedAndOpenStrings : function() {
		var r = this.renderer;
		for (var i in this.positions) {
			var pos = this.positions[i];
			var x = i*CELL_WIDTH;
			var y = -NUT_SIZE*1.3 - DOT_RADIUS;
			var y = -NUT_SIZE*1.3 - DOT_RADIUS;
			if (this.startFret > 1) {
				y+=NUT_SIZE
			}
			if (pos == MUTED) {
				this.drawCross(x,y,DOT_RADIUS)
			} else if (pos == 0) {
				r.circle(x,y,DOT_RADIUS)
			}
		}
	},
	
	drawPositions : function() {
		var r = this.renderer;
		for (var i in this.positions) {
			var pos = this.positions[i];
			if (pos > 0) {
				var relativePos = pos - this.startFret+1;
				var x = i*CELL_WIDTH;
				if (relativePos <= 5) {
					var y = relativePos*CELL_HEIGHT-(CELL_HEIGHT/2)
					r.circle(x,y,DOT_RADIUS,true)
				}
			}
		}
	},
	
	toString : function() {
		return 'Chord';
	},
	
	drawFretGrid : function() {
		var r = this.renderer;
		var width = (this.stringCount-1)*CELL_WIDTH
		for (var i = 0; i <= this.stringCount-1; i++) {
			var x = i*CELL_WIDTH;
			r.line(x,0,x,this.fretCount*CELL_HEIGHT)
		}
		
		for (var i = 0; i <= this.fretCount; i++) {
			var y = i*CELL_HEIGHT
			r.line(0,y,width,y);
		}
	},
	
	drawNut : function() {
		var r = this.renderer;
		if (this.startFret == 1) {
			r.rect(0,-NUT_SIZE,this.boxWidth,NUT_SIZE,true);
		} else {
			r.text(-CELL_WIDTH, CELL_HEIGHT / 2.0, this.startFret+'', FONT, CELL_HEIGHT, 'middle', 'right');
		}
	},
	
	drawName : function() {
		var r = this.renderer;
		r.text(this.boxWidth/2.0, -5, this.name, FONT, NAME_FONT_SIZE, 'bottom', 'center');
	},
	
	draw : function(options) {
		options = options || {}
		this.renderer.init(options)
		this.drawFretGrid();
		this.drawNut();
		this.drawName()
		this.drawMutedAndOpenStrings()
		this.drawPositions()
		this.drawFingerings()
		this.drawBars()
	},
	
	getImage : function(options) {
		this.renderer = this.canvasRenderer;
		this.draw(options)
		var img = document.createElement('img')
		img.src = this.renderer.canvas.toDataURL()
		return img
	},
	
	drawBars : function() {
		var r = this.renderer;
		if (this.fingerings.length>0) {
			var bars = {}
			for (var i = 0; i < this.positions.length; i++) {
				var fret = this.positions[i]
				if (fret > 0) {
					if (bars[fret]&& bars[fret].finger == this.fingerings[i]) {
						bars[fret].length = i - bars[fret].index
					} else {
						bars[fret] = { finger:this.fingerings[i], length:0, index:i}
					}
				}
			}
			for (var fret in bars) {
				if (bars[fret].length > 0) {
					var xStart = bars[fret].index * CELL_WIDTH;
					var xEnd = xStart+bars[fret].length*CELL_WIDTH;
					var relativePos = fret - startFret+1;
					var y = relativePos*CELL_HEIGHT-(CELL_HEIGHT/2);
					r.line(xStart,y,xEnd,y, DOT_RADIUS);
				}
			}

			//Explicit, calculate from that
		} else {
			//Try to guesstimate whether there is a bar or not				
			var barFret = this.positions[this.positions.length-1];
			if (barFret <= 0) {
				return;
			}
			if (this.positions.join('') == '-1-10232') { //Special case for the D chord...
				return
			}
			var startIndex = -1;

			for (var i = 0; i < this.positions.length-2;i++) {
				var fret = this.positions[i];
				if (fret > 0 && fret < barFret) {
					return
				} else if (fret == barFret && startIndex == -1) {
					startIndex = i
				} else if (startIndex != -1 && fret < barFret) {
					return
				}
			}
			if (startIndex >= 0) {
				var xStart = startIndex * CELL_WIDTH;
				var xEnd = (this.positions.length-1)*CELL_WIDTH
				var relativePos = barFret - this.startFret+1
				var y = relativePos*CELL_HEIGHT-(CELL_HEIGHT/2)
				r.line(xStart,y,xEnd,y, DOT_RADIUS);
			}
		}
	},
	
	drawCross : function(x, y, radius) {
		var r = this.renderer;
		var angle = Math.PI/4
		for (var i = 0; i < 2; i++) {
			var startAngle = angle + i*Math.PI/2
			var endAngle = startAngle + Math.PI

			var startX = x + radius * Math.cos(startAngle)
			var startY = y + radius * Math.sin(startAngle)
			var endX = x + radius * Math.cos(endAngle)
			var endY = y + radius * Math.sin(endAngle)
			r.line(startX,startY,endX,endY,1.5*LINE_WIDTH,'round');
		}
	},
	
	drawFingerings : function() {
		var r = this.renderer;
		var fontSize = CELL_HEIGHT;
		for (var i in this.fingerings) {
			var finger = this.fingerings[i]
			var x = i*CELL_WIDTH;
			var y = this.fretCount*CELL_HEIGHT;
			if (finger) {
				r.text(x,y,finger, FONT, fontSize, 'top', 'center');
			} 
		}
	}
}

Chord.prototype.canvasRenderer = {

	init : function(options) {
		this.canvas = document.createElement('canvas');
		var ctx = this.ctx = this.canvas.getContext('2d');
		this.canvas.width = WIDTH
		this.canvas.height = WIDTH

		
		ctx.translate(0.5,0.5)
		ctx.strokeRect(0,0,WIDTH-1,HEIGHT-1)

		ctx.translate(CELL_HEIGHT*2,CELL_WIDTH*2);
		ctx.scale(0.6,0.6);
		ctx.lineJoin = 'miter'
		ctx.lineWidth = LINE_WIDTH
		ctx.lineCap = 'square'
		ctx.strokeStyle = 'black'
//		if (canvasScale != 1) {
//			ctx.scale(canvasScale, canvasScale)
//		}
	},
	
	line : function(x1,y1,x2,y2,width,cap) {
		var c = this.ctx;
		if (width % 2 == 0) {
			width++;
		}
		c.save();
		c.lineWidth = width || LINE_WIDTH;
		c.lineCap = cap || 'square';
		c.beginPath();
		c.moveTo(x1,y1);
		c.lineTo(x2,y2);
		c.stroke();
		c.restore();
	},
	
	text : function(x,y,text,font,size,baseline,align) {
		this.ctx.font = size + 'px ' + font;
		this.ctx.textBaseline = baseline;
		this.ctx.textAlign = align;
		this.ctx.fillText(text,x,y)
	},
	
	rect : function(x,y,width,height,fillRect) {
		if (fillRect) {
			this.ctx.fillRect(x-0.5,y-0.5,width+1,height+1);
		} else {
			this.ctx.strokeRect(x,y,width,height);
		}
	},
	
	circle : function(x,y,radius, fillCircle) {
		var c = this.ctx;
		c.beginPath()
		if (!fillCircle) {
			radius -= c.lineWidth
		}
		radius = Math.floor(radius)+0.5;
		c.arc(x,y,radius,2*Math.PI,false)
		if (fillCircle) {
			c.fill()
		} else {
			c.stroke()
		}
	}
};

if (document.addEventListener) {
	document.addEventListener('DOMContentLoaded', function() {
		Chord.render(document.getElementsByTagName('span'))
	}, true)
}

Chord.render = function(elements) {
	
	for (var i = 0; i < elements.length; i++) {
		var el = elements[i];
		var chordDef = el.getAttribute('data-chord');
		var chordName = el.firstChild.nodeValue;
		if (chordDef && chordDef.match(Chord.regex)) {
			el.replaceChild(new Chord(chordName, RegExp.$1, RegExp.$3).getImage(), el.firstChild);
		}
	}
}