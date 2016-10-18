"use strict";

const MS_PER_FRAME = 1000/8;

/**
 * @module exports the Asteroid class
 */
module.exports = exports = Asteroid;

/**
 * @constructor Asteroid
 * Creates a new asteroid object
 * @param {Postition} position object specifying an x and y
 */
function Asteroid(position, velocity, mass, canvas) {
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.position = {
    x: position.x,
    y: position.y
  };
  this.width  = position.width;
  this.height = position.height;
  this.radius = this.width/2;
  this.mass = mass;
  this.velocity = {
    x: velocity.x,
    y: velocity.y
  }
  this.spritesheet = new Image();
  this.spritesheet.src = encodeURI('assets/asteroids/large/c10000.png');
}

/**
 * @function updates the asteroid object
 */
Asteroid.prototype.update = function() {
  // Apply velocity
  this.position.x += this.velocity.x;
  this.position.y += this.velocity.y;
  // Wrap around the screen
  if(this.position.x < 0) this.position.x += this.worldWidth;
  if(this.position.x > this.worldWidth) this.position.x -= this.worldWidth;
  if(this.position.y < 0) this.position.y += this.worldHeight;
  if(this.position.y > this.worldHeight) this.position.y -= this.worldHeight;
}

/**
 * @function renders the asteroid into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Asteroid.prototype.render = function(time, ctx) {
  ctx.save();
  ctx.drawImage(
    //image
    this.spritesheet,
    //source rectangle
    0, 0, 320, 240,
    //destination rectangle
    this.position.x, this.position.y, this.width, this.height
  );
  ctx.restore();
}
