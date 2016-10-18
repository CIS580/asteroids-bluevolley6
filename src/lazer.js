"use strict";

const MS_PER_FRAME = 1000/8;

/**
 * @module exports the Player class
 */
module.exports = exports = Lazer;

/**
 * @constructor Lazer
 * Creates a new lazer object
 * @param {Postition} position object specifying an x and y
 */
function Lazer(position, canvas) {
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.position = {
    x: position.x,
    y: position.y
  };
  this.angle = position.angle;
  this.velocity = {
    x: Math.cos(this.angle),
    y: Math.sin(this.angle)
  }
  this.color = 'red';
}

/**
 * @function updates the lazer object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Lazer.prototype.update = function(time) {
  // Apply velocity
  this.position.x += this.velocity.x * 10;
  this.position.y -= this.velocity.y * 10;

  if(this.position.x < 0 || this.position.x > this.worldWidth || this.position.y < 0 || this.position.y > this.worldHeight) {
    this.color = 'black';
  }
}

/**
 * @function renders the lazer into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Lazer.prototype.render = function(time, ctx) {
  ctx.save();
  ctx.strokeStyle = this.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(this.position.x, this.position.y);
  ctx.lineTo(this.position.x + 10*this.velocity.x, this.position.y - 10*this.velocity.y);
  ctx.stroke();
  ctx.restore();
}
