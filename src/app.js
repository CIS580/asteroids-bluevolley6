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
for(i=0; i < 12; i++) {
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
          for(i=0; i < 12; i++) {
            asteroids.push(new Asteroid({
              x:Math.floor(Math.random() * canvas.width),
              y:Math.floor(Math.random() * canvas.height)},{
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
        console.log(asteroids.length);
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
