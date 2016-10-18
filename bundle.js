(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict;"

/* Classes */
const Game = require('./game.js');
const Vector = require('./vector.js');
const Player = require('./player.js');
const Asteroid = require('./asteroid.js');
const Lazer = require('./lazer.js');


/* Global variables */
var canvas = document.getElementById('screen');
var game = new Game(canvas, update, render);
var player = new Player({x: canvas.width/2, y: canvas.height/2}, canvas);

var explode = new Audio();
explode.src = 'explode.wav';

var crash = new Audio();
crash.src = 'qubodup-crash.ogg';

var lazerSound = new Audio();
lazerSound.src = '8bit_bomb_explosion.wav';

var lives = 4;
var time;
var count = 0;
var score = 0;
var level = 1;
var lazers = [];
var shooting = false;

var asteroids = [];
for(i=0; i < 3; i++) {
  asteroids.push(new Asteroid({
    x:Math.floor(Math.random() * canvas.width),
    y:Math.floor(Math.random() * canvas.height),
    width: 72,
    height: 72},{
      x:Math.floor(Math.random()*3) + 1,
      y:Math.floor(Math.random()*3) + 1
    },
    Math.floor(Math.random()*5) + 1,
    canvas
  ));
}
/**
 * @function masterLoop
 * Advances the game in sync with the refresh rate of the screen
 * @param {DOMHighResTimeStamp} timestamp the current time
 */
var masterLoop = function(timestamp) {
  game.loop(timestamp);
  window.requestAnimationFrame(masterLoop);
}
masterLoop(performance.now());

window.onkeydown = function(event) {
  switch(event.key) {
    case 'ArrowUp': // up
    case 'w':
      player.thrusting = true;
      break;
    case 'ArrowLeft': // left
    case 'a':
      player.steerLeft = true;
      break;
    case 'ArrowRight': // right
    case 'd':
      player.steerRight = true;
      break;
    case ' ': //spacebar
      if(shooting == false && player.state != "dead") {
        lazers.push(new Lazer({
          x:player.position.x,
          y:player.position.y,
          angle: player.angle % (2*Math.PI) + Math.PI/2},
          canvas
        ));
        lazerSound.play();
        shooting = true;
      }
      break;
  }
}

window.onkeyup = function(event) {
  switch(event.key) {
    case 'ArrowUp': // up
    case 'w':
      player.thrusting = false;
      break;
    case 'ArrowLeft': // left
    case 'a':
      player.steerLeft = false;
      break;
    case 'ArrowRight': // right
    case 'd':
      player.steerRight = false;
      break;
    case ' ':
      shooting = false;
      break;
  }
}

/**
 * @function update
 * Updates the game state, moving
 * game objects and handling interactions
 * between them.
 * @param {DOMHighResTimeStamp} elapsedTime indicates
 * the number of milliseconds passed since the last frame.
 */
function update(elapsedTime) {
  player.update(elapsedTime);
  // TODO: Update the game objects
  asteroids.sort(function(a,b){return a.position.x - b.position.x});

  //check for asteroid collisions
  asteroidCollisions();
  if(player.state != "dead") {
    playerCollision();
  }
  lazerCollsion();
  asteroids.forEach(function(asteroid){asteroid.update();});
  lazers.forEach(function(lazer){lazer.update();});
}

//Check to see if any asteroids have collided
function asteroidCollisions(){
  var active = [];
  var potentiallyColliding = [];

  asteroids.forEach(function(ball, aindex){
    active = active.filter(function(oball){
      return ball.position.x - oball.position.x  < ball.width;
    });
    active.forEach(function(oball, bindex){
      potentiallyColliding.push({a: oball, b: ball});
    });
    active.push(ball);
  });

  var collisions = [];
  potentiallyColliding.forEach(function(pair){
    var distSquared =
      Math.pow(pair.a.position.x - pair.b.position.x, 2) +
      Math.pow(pair.a.position.y - pair.b.position.y, 2);
    var radiusSquared =
      Math.pow(pair.a.radius, 2) + Math.pow(pair.b.radius, 2);
    if(distSquared < radiusSquared) {
      // Push the colliding pair into our collisions array
      collisions.push(pair);
    }
  });

  collisions.forEach(function(pair) {
    // Find the normal of collision
    var collisionNormal = {
      x: pair.a.position.x - pair.b.position.x,
      y: pair.a.position.y - pair.b.position.y
    }
    // calculate the overlap between balls
    var overlap = pair.a.width - Vector.magnitude(collisionNormal);
    var collisionNormal = Vector.normalize(collisionNormal);
    pair.a.position.x += collisionNormal.x * overlap / 2;
    pair.a.position.y += collisionNormal.y * overlap / 2;
    pair.b.position.x -= collisionNormal.x * overlap / 2;
    pair.b.position.y -= collisionNormal.y * overlap / 2;
    // Rotate the problem space so that the normal
    // of collision lies along the x-axis
    var angle = Math.atan2(collisionNormal.y, collisionNormal.x);
    var a = Vector.rotate(pair.a.velocity, angle);
    var b = Vector.rotate(pair.b.velocity, angle);
    // Solve the collisions along the x-axis
    var aPrevious = a.x;
    var bPrevious = b.x;

    a.x = (aPrevious * (pair.a.mass - pair.b.mass) + 2 * pair.b.mass * bPrevious)/(pair.a.mass + pair.b.mass);
    b.x = (bPrevious * (pair.b.mass - pair.a.mass) + 2 * pair.a.mass * aPrevious)/(pair.a.mass + pair.b.mass);
    // Rotate the problem space back to world space
    a = Vector.rotate(a, -angle);
    b = Vector.rotate(b, -angle);
    pair.a.velocity.x = a.x;
    pair.a.velocity.y = a.y;
    pair.b.velocity.x = b.x;
    pair.b.velocity.y = b.y;
    crash.play();
  });
  return;
}

//check to see if player hit an asteroid
function playerCollision(){
  for(var i=0; i < asteroids.length; i++) {
    var distSquared =
      Math.pow(player.position.x - asteroids[i].position.x, 2) +
      Math.pow(player.position.y - asteroids[i].position.y, 2);
    if(distSquared < Math.pow(10+asteroids[i].radius, 2)) {
      player.state = "dead";
      explode.play();
      return;
    }
  }
  return;
}

//check to see if lazer hit an asteroids
function lazerCollsion(){
  for(var i = 0; i < asteroids.length; i++){
    for(var j = 0; j < lazers.length; j++){
      var distSquared =
        Math.pow((lazers[j].position.x) - (asteroids[i].position.x + asteroids[i].radius), 2) +
        Math.pow((lazers[j].position.y) - (asteroids[i].position.y + asteroids[i].radius), 2);

      if(distSquared < Math.pow(asteroids[i].radius, 2) && lazers[j].color == 'red') {
        // Laser struck asteroid
        lazers[j].color = 'black';
        if(asteroids[i].width > 18){
          var angle = Math.atan(asteroids[i].velocity.y/asteroids[i].velocity.x);
          var velocity1 = {x: Math.cos(angle + Math.PI/4)*1.5, y: Math.sin(angle + Math.PI/4)*1.5};
          var velocity2 = {x: Math.cos(angle - Math.PI/4)*1.5, y: Math.sin(angle - Math.PI/4)*1.5};

          asteroids.push(new Asteroid({
            x:asteroids[i].position.x,
            y:asteroids[i].position.y,
            width: asteroids[i].width/2,
            height: asteroids[i].height/2},
            velocity1,
            asteroids[i].mass/2,
            canvas
          ));

          asteroids.push(new Asteroid({
            x:asteroids[i].position.x,
            y:asteroids[i].position.y,
            width: asteroids[i].width/2,
            height: asteroids[i].height/2},
            velocity2,
            asteroids[i].mass/2,
            canvas
          ));
        }
        if(asteroids.length == 1) {
          asteroids.splice(i,1);
          level++;
          console.log('here');
          for(i=0; i < 10; i++) {
            asteroids.push(new Asteroid({
              x:Math.floor(Math.random() * canvas.width),
              y:Math.floor(Math.random() * canvas.height),
              width: 72,
              height: 72},{
                x:Math.floor(Math.random()*3) + 1,
                y:Math.floor(Math.random()*3) + 1
              },
              Math.floor(Math.random()*5) + 1,
              canvas
            ));
          }
        } else {
          asteroids.splice(i,1);
        }
        score += 10;
        break;
      }
    }
  }
  return;
}

/**
  * @function render
  * Renders the current game state into a back buffer.
  * @param {DOMHighResTimeStamp} elapsedTime indicates
  * the number of milliseconds passed since the last frame.
  * @param {CanvasRenderingContext2D} ctx the context to render to
  */
function render(elapsedTime, ctx) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  player.render(elapsedTime, ctx);
  asteroids.forEach(function(asteroid){asteroid.render(elapsedTime, ctx);});
  lazers.forEach(function(lazer){lazer.render(elapsedTime, ctx);});

  if(player.state == "dead") {
    if(count == 0) {
      time = elapsedTime;
      count++;
      lives--;
    } else {
      time+= elapsedTime;
      if(time > 1000) {
        time = 0;
        count = 0;
        player.state = "idle";
      }
    }
  }

  ctx.fillStyle = "yellow";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Score: " + score, 0, 15);
  ctx.fillStyle = "yellow";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Lives: " + lives, 1, 30);
  ctx.fillStyle = "yellow";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Level: " + level, 1, 45);

  if(lives == 0) {
    game.over = true;
    ctx.fillStyle = "red";
    ctx.font = "bold 32px Arial";
    ctx.fillText("Game Over", canvas.width/2 - 90, canvas.height/2);
  }
}

},{"./asteroid.js":2,"./game.js":3,"./lazer.js":4,"./player.js":5,"./vector.js":6}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
"use strict";

/**
 * @module exports the Game class
 */
module.exports = exports = Game;

/**
 * @constructor Game
 * Creates a new game object
 * @param {canvasDOMElement} screen canvas object to draw into
 * @param {function} updateFunction function to update the game
 * @param {function} renderFunction function to render the game
 */
function Game(screen, updateFunction, renderFunction) {
  this.update = updateFunction;
  this.render = renderFunction;

  // Set up buffers
  this.frontBuffer = screen;
  this.frontCtx = screen.getContext('2d');
  this.backBuffer = document.createElement('canvas');
  this.backBuffer.width = screen.width;
  this.backBuffer.height = screen.height;
  this.backCtx = this.backBuffer.getContext('2d');

  // Start the game loop
  this.oldTime = performance.now();
  this.paused = false;
  this.over = false;
}

/**
 * @function pause
 * Pause or unpause the game
 * @param {bool} pause true to pause, false to start
 */
Game.prototype.pause = function(flag) {
  this.paused = (flag == true);
}

/**
 * @function loop
 * The main game loop.
 * @param{time} the current time as a DOMHighResTimeStamp
 */
Game.prototype.loop = function(newTime) {
  var game = this;
  var elapsedTime = newTime - this.oldTime;
  this.oldTime = newTime;

  if(!game.over) {
    if(!this.paused) this.update(elapsedTime);
    this.render(elapsedTime, this.frontCtx);

    // Flip the back buffer
    this.frontCtx.drawImage(this.backBuffer, 0, 0);
  }
}

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
"use strict";

const MS_PER_FRAME = 1000/8;

/**
 * @module exports the Player class
 */
module.exports = exports = Player;

/**
 * @constructor Player
 * Creates a new player object
 * @param {Postition} position object specifying an x and y
 */
function Player(position, canvas) {
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.state = "dead";
  this.position = {
    x: position.x,
    y: position.y
  };
  this.velocity = {
    x: 0,
    y: 0
  }
  this.angle = 0;
  this.radius  = 64;
  this.thrusting = false;
  this.steerLeft = false;
  this.steerRight = false;
}

/**
 * @function updates the player object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Player.prototype.update = function(time) {
  // Apply angular velocity
  if(this.steerLeft) {
    this.angle += time * 0.005;
  }
  if(this.steerRight) {
    this.angle -= 0.1;
  }
  // Apply acceleration
  if(this.thrusting) {
    var acceleration = {
      x: Math.sin(this.angle),
      y: Math.cos(this.angle)
    }
    this.velocity.x -= acceleration.x;
    this.velocity.y -= acceleration.y;
  } else { //slow down when not thrusting
    this.velocity.x *= .9;
    this.velocity.y *= .9;
  }
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
 * @function renders the player into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Player.prototype.render = function(time, ctx) {
  ctx.save();

  // Draw player's ship
  if(this.state != "dead") {
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(-this.angle);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-10, 10);
    ctx.lineTo(0, 0);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.strokeStyle = 'white';
    ctx.stroke();

    // Draw engine thrust
    if(this.thrusting) {
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(5, 10);
      ctx.arc(0, 10, 5, 0, Math.PI, true);
      ctx.closePath();
      ctx.strokeStyle = 'orange';
      ctx.stroke();
    }
  }
  ctx.restore();
}

},{}],6:[function(require,module,exports){
/**
 * @module Vector
 * A library of vector functions.
 */
module.exports = exports = {
  rotate: rotate,
  dotProduct: dotProduct,
  magnitude: magnitude,
  normalize: normalize
}

/**
 * @function rotate
 * Rotates a vector about the Z-axis
 * @param {Vector} a - the vector to rotate
 * @param {float} angle - the angle to roatate by (in radians)
 * @returns a new vector representing the rotated original
 */
function rotate(a, angle) {
  return {
    x: a.x * Math.cos(angle) - a.y * Math.sin(angle),
    y: a.x * Math.sin(angle) + a.y * Math.cos(angle)
  }
}

/**
 * @function dotProduct
 * Computes the dot product of two vectors
 * @param {Vector} a the first vector
 * @param {Vector} b the second vector
 * @return the computed dot product
 */
function dotProduct(a, b) {
  return a.x * b.x + a.y * b.y
}

/**
 * @function magnitude
 * Computes the magnitude of a vector
 * @param {Vector} a the vector
 * @returns the calculated magnitude
 */
function magnitude(a) {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

/**
 * @function normalize
 * Normalizes the vector
 * @param {Vector} a the vector to normalize
 * @returns a new vector that is the normalized original
 */
function normalize(a) {
  var mag = magnitude(a);
  return {x: a.x / mag, y: a.y / mag};
}

},{}]},{},[1]);
